import { useState } from 'react';
import { DATA_MODE } from '../../firebase.js';

/**
 * Redimensiona e comprime a imagem no cliente usando HTML5 Canvas (formato WebP/JPEG, máx 900px),
 * reduzindo fotos de 5MB+ para ~35KB antes de enviar ao armazenamento local.
 */
function compressImage(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', quality);
        canvas.toBlob(
          (blob) => resolve({ blob, dataUrl }),
          'image/webp',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUploader({ onUploadSuccess, onUploadStart, onError, className, children }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (DATA_MODE !== 'local') {
      if (onError) onError('Uploads no backend ainda estão bloqueados até a implementação do processamento seguro de imagens.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      if (onError) onError('Apenas arquivos de imagem são permitidos.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      if (onError) onError('A imagem deve ter no máximo 10 MB.');
      return;
    }

    if (onUploadStart) onUploadStart();
    setUploading(true);
    setProgress(20);

    try {
      const { blob, dataUrl } = await compressImage(file);
      setProgress(60);

      if (!blob) throw new Error('Não foi possível comprimir a imagem.');
      const finalUrl = dataUrl;
      setProgress(100);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        if (onUploadSuccess) onUploadSuccess(finalUrl);
      }, 200);
    } catch (err) {
      setUploading(false);
      setProgress(0);
      if (onError) onError(err.message || 'Erro ao processar a imagem.');
    }
  };

  return (
    <div className={className}>
      <label className={uploading ? 'opacity-50 cursor-not-allowed pointer-events-none block' : 'cursor-pointer block'}>
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center justify-center p-2">
            <div className="w-5 h-5 border-2 border-[#EA1D2C] border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] font-bold text-[#EA1D2C]">{Math.round(progress)}%</span>
          </div>
        ) : (
          children || (
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition shrink-0 border border-slate-200">
              <i className="ph-bold ph-image text-lg" />
            </div>
          )
        )}
      </label>
    </div>
  );
}
