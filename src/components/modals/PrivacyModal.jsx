// src/components/modals/PrivacyModal.jsx
import { createPortal } from 'react-dom';

export default function PrivacyModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-2xl w-full max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-slide-down">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="ph-fill ph-shield-check text-lg" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Termos de Uso e Política de Privacidade</h2>
              <p className="text-xs text-slate-500">Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center transition cursor-pointer"
          >
            <i className="ph-bold ph-x text-sm" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section>
            <h3 className="font-bold text-slate-900 mb-1">1. Coleta e Finalidade do Tratamento de Dados</h3>
            <p>
              O <strong>mãoAobra</strong> coleta apenas os dados estritamente necessários (Princípio da Minimização — Art. 6º, III da LGPD) para viabilizar a conexão entre Contratantes e Prestadores de Serviço: nome completo, CPF (para verificação antifraude), telefone/WhatsApp, e-mail e endereço para cálculo de distância e atendimento.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-1">2. Segurança e Criptografia</h3>
            <p>
              Suas credenciais de acesso são protegidas por criptografia unidirecional (Hash SHA-256 com Salt) e autenticação via token, nunca sendo armazenadas em texto aberto. O CPF é mascarado nas interfaces de visualização (`***.XXX.XXX-**`).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-1">3. Compartilhamento de Dados</h3>
            <p>
              Para perfis de <strong>Prestadores de Serviço</strong>, o nome, categorias, cidade/UF, bio e WhatsApp comercial ficam visíveis no catálogo público mediante consentimento. Para <strong>Contratantes</strong>, os dados básicos de solicitação são compartilhados apenas com o profissional acionado em um pedido.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-1">4. Direitos do Titular e Exclusão Definitiva (Art. 18 da LGPD)</h3>
            <p>
              A qualquer momento, você pode consultar, retificar seus dados ou exercer o <strong>Direito ao Esquecimento</strong> diretamente na aba <em>Minha Conta / Perfil</em> clicando em <strong>"Excluir Minha Conta e Dados (LGPD)"</strong>, o que remove permanentemente seu cadastro, serviços, histórico e mensagens do banco de dados.
            </p>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Entendi e Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

