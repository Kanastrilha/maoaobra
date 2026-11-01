import { createPortal } from 'react-dom';
import { DATA_MODE } from '../../firebase.js';

export default function PrivacyModal({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="privacy-title" className="bg-white max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl">
        <h2 id="privacy-title" className="text-lg font-extrabold mb-4">Sobre os dados desta demonstração</h2>
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>Esta é uma cópia local do mãoAobra para testar alterações. Os perfis iniciais são fictícios. Não informe CPF, endereço, senha ou fotos pessoais reais.</p>
          {DATA_MODE === 'local' ? <>
            <p>Cadastros, pedidos, imagens e conversas ficam no armazenamento deste navegador (IndexedDB). Não são enviados ao Firebase do site original e não são compartilhados entre computadores.</p>
            <p>As senhas cadastradas aqui usam PBKDF2 com salt aleatório. As contas fictícias de acesso rápido usam a senha de demonstração 123. Este modo local não substitui a autenticação de um serviço publicado.</p>
          </> : <>
            <p>Cadastros, pedidos e conversas usam os emuladores Firebase executados neste computador. O projeto demo-maoaobra-copia não acessa a nuvem nem o Firebase original. Os dados de teste desaparecem ao encerrar os emuladores.</p>
            <p>O Auth Emulator cuida do login, confirmação de e-mail e recuperação de senha. Ele é uma ferramenta de desenvolvimento e não possui as garantias de segurança do serviço publicado. Use somente dados e senhas fictícios. Uploads e exclusão de conta estão desativados nesta etapa.</p>
          </>}
          <p>O CPF é verificado apenas pelo cálculo dos dígitos. Não há consulta à Receita Federal nem confirmação de identidade. Os selos de aprovação representam a análise simulada pelo administrador local.</p>
          {DATA_MODE === 'local' && <p>Ao excluir uma conta local, os dados associados, credenciais, pedidos, mensagens e imagens incorporadas aos registros são removidos desta base. Limpar os dados do navegador também apaga a demonstração.</p>}
          <p>O preenchimento por CEP usa o ViaCEP. Fontes, ícones e imagens de exemplo podem carregar de serviços externos. Uma versão pública exigirá um ambiente próprio, autenticação no servidor e uma política adequada ao seu funcionamento.</p>
        </div>
        <button onClick={onClose} className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-semibold">Entendi e fechar</button>
      </section>
    </div>, document.body,
  );
}
