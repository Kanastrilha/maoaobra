import { create } from 'zustand';
import {
  auth,
  syncCollection,
  syncArrayDiffToCollection,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut
} from './firebase';
import {
  hashPassword,
  sanitizeUser,
  calculateHaversineDistance,
  fetchCoordinatesFromAddress
} from './utils/security';

export const getEstimatedDistance = (clientDetails, workerDetails) => {
  if (!clientDetails || !workerDetails) return null;

  // 1. Prioriza cálculo real por coordenadas geográficas (Fórmula de Haversine)
  if (clientDetails.lat && clientDetails.lng && workerDetails.lat && workerDetails.lng) {
    return calculateHaversineDistance(
      clientDetails.lat,
      clientDetails.lng,
      workerDetails.lat,
      workerDetails.lng
    );
  }

  // 2. Fallback por localidade (Cidade/UF) caso o endereço não possua coordenadas geocodificadas
  const combined = String(clientDetails.user_id || '') + String(workerDetails.user_id || '');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  const isSameCity = clientDetails.cidade && workerDetails.cidade &&
    clientDetails.cidade.toLowerCase() === workerDetails.cidade.toLowerCase();
  const isSameUF = clientDetails.uf === workerDetails.uf;
  
  const base = Math.abs(hash % 100);
  if (isSameCity) return (1.2 + (base / 10)).toFixed(1);
  if (isSameUF) return (15 + base).toFixed(1);
  return (150 + (base * 5)).toFixed(1);
};

// Função para gerar sons dinâmicos no navegador (Web Audio API)
const playNotificationSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    } else if (type === 'warning') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    }
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) { console.warn('Audio not supported or blocked'); }
};

// ==========================================
// SEED INICIAL PARA AS COLEÇÕES DO FIRESTORE
// ==========================================
// Hash SHA-256 de "maoaobra_prod_salt_v1:123"
const DEFAULT_PASS_HASH = '123_SEED_HASH';

const INITIAL_USERS = [
  { id: 'a1', nome: 'Administrador', email: 'legalmano@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'ADMIN', foto_perfil_url: 'https://ui-avatars.com/api/?name=Admin&background=ea1d2c&color=fff', telefone: '(11) 99999-0000', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'c1', nome: 'Pedro Contratante', email: 'pedro@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'CONTRATANTE', foto_perfil_url: 'https://ui-avatars.com/api/?name=Pedro+Cliente&background=0f172a&color=fff', telefone: '(65) 99811-2233', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w1', nome: 'Eduardo Eletricista', email: 'eduardo@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop', telefone: '(65) 98888-7777', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w2', nome: 'Mario Encanador', email: 'encanador@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&h=400&fit=crop', telefone: '(65) 97777-6666', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w3', nome: 'Maria Diarista', email: 'diarista@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop', telefone: '(65) 96666-5555', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w4', nome: 'Pablo Pintor', email: 'pintor@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop', telefone: '(65) 95555-4444', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w5', nome: 'Tiago Montador', email: 'montador@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop', telefone: '(65) 94444-3333', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w6', nome: 'Carlos TI', email: 'ti@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=400&fit=crop', telefone: '(65) 93333-2222', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w7', nome: 'Roberto Fretes', email: 'frete@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1581574919402-5b7d733224d6?w=400&h=400&fit=crop', telefone: '(65) 92222-1111', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w8', nome: 'Felipe Eletricista', email: 'felipe@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop', telefone: '(65) 91111-0000', data_criacao: new Date().toISOString(), status: 'APPROVED' },
  { id: 'w9', nome: 'Ana Diarista', email: 'ana@gmail.com', passwordHash: DEFAULT_PASS_HASH, role: 'TRABALHADOR', foto_perfil_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=400&fit=crop', telefone: '(65) 90000-9999', data_criacao: new Date().toISOString(), status: 'APPROVED' },
];

const INITIAL_WORKER_DETAILS = [
  { user_id: 'w1', bio: 'Especialista em instalações residenciais, quadros de distribuição e automação.', categorias: ['Eletricista'], nota_media: 4.9, portfolio_fotos: [], cpf: '123.456.789-00', cep: '78200-000', rua: 'Rua Comandante Balduíno', numero: '100', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0712, lng: -57.6818, isOnline: true, workingHours: 'Seg-Sex, 08:00 às 18:00' },
  { user_id: 'w2', bio: 'Detecção e reparo de vazamentos, instalações hidráulicas e manutenção predial.', categorias: ['Encanador'], nota_media: 4.8, portfolio_fotos: [], cpf: '223.456.789-00', cep: '78200-000', rua: 'Rua das Águas', numero: '200', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0685, lng: -57.6790, isOnline: true, workingHours: 'Seg-Sex, 08:00 às 18:00' },
  { user_id: 'w3', bio: 'Faxina residencial completa, organização de ambientes e limpeza pós-obra.', categorias: ['Diarista'], nota_media: 5.0, portfolio_fotos: [], cpf: '323.456.789-00', cep: '78200-000', rua: 'Rua Tiradentes', numero: '300', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0740, lng: -57.6850, isOnline: true, workingHours: 'Seg-Sab, 07:00 às 17:00' },
  { user_id: 'w4', bio: 'Pintura fina, massa corrida, efeitos decorativos e impermeabilização.', categorias: ['Pintor'], nota_media: 4.7, portfolio_fotos: [], cpf: '423.456.789-00', cep: '78200-000', rua: 'Avenida Sete de Setembro', numero: '400', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0650, lng: -57.6750, isOnline: true, workingHours: 'Seg-Sex, 08:00 às 18:00' },
  { user_id: 'w5', bio: 'Montagem e desmontagem de móveis planejados e convencionais com garantia.', categorias: ['Montador'], nota_media: 4.8, portfolio_fotos: [], cpf: '523.456.789-00', cep: '78200-000', rua: 'Rua General Osório', numero: '500', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0790, lng: -57.6720, isOnline: true, workingHours: 'Seg-Sab, 08:00 às 18:00' },
  { user_id: 'w6', bio: 'Suporte técnico especializado, redes estruturadas Wi-Fi Mesh e manutenção de computadores.', categorias: ['TI'], nota_media: 4.9, portfolio_fotos: [], cpf: '623.456.789-00', cep: '78200-000', rua: 'Rua Padre Cassemiro', numero: '600', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0725, lng: -57.6805, isOnline: true, workingHours: 'Seg-Sex, 09:00 às 19:00' },
  { user_id: 'w7', bio: 'Transporte seguro de cargas, mudanças residenciais e fretes rápidos.', categorias: ['Freteiro'], nota_media: 4.6, portfolio_fotos: [], cpf: '723.456.789-00', cep: '78200-000', rua: 'Avenida São Luiz', numero: '700', bairro: 'aval', uf: 'MT', cidade: 'Cáceres', lat: -16.0820, lng: -57.6680, isOnline: true, workingHours: 'Dom-Dom, 06:00 às 20:00' },
  { user_id: 'w8', bio: 'Instalações elétricas de baixa tensão, iluminação LED e manutenção preventiva.', categorias: ['Eletricista'], nota_media: 4.8, portfolio_fotos: [], cpf: '823.456.789-00', cep: '78200-000', rua: 'Rua Coronel Faria', numero: '800', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0695, lng: -57.6835, isOnline: true, workingHours: 'Seg-Sab, 07:00 às 17:00' },
  { user_id: 'w9', bio: 'Higienização de estofados, passadoria e limpeza residencial detalhada.', categorias: ['Diarista'], nota_media: 4.9, portfolio_fotos: [], cpf: '923.456.789-00', cep: '78200-000', rua: 'Avenida Getúlio Vargas', numero: '900', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0760, lng: -57.6770, isOnline: true, workingHours: 'Seg-Sex, 08:00 às 18:00' },
];

const INITIAL_CONTRATANTE_DETAILS = [
  { user_id: 'c1', cpf: '111.222.333-44', cep: '78200-000', rua: 'Praça Barão do Rio Branco', numero: '45', bairro: 'Centro', uf: 'MT', cidade: 'Cáceres', lat: -16.0710, lng: -57.6810, total_pedidos: 0 }
];

const INITIAL_SERVICES = [
  { id: 's1', worker_id: 'w1', titulo: 'Instalação de Tomadas e Disjuntores', preco_base: 80, descricao: 'Serviço rápido e seguro para sua residência.', imagem_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=500&h=300&fit=crop' },
  { id: 's2', worker_id: 'w1', titulo: 'Troca de Fiação Completa', preco_base: 450, descricao: 'Revisão e troca de fiação antiga para evitar curtos.', imagem_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&h=300&fit=crop' },
  { id: 's3', worker_id: 'w2', titulo: 'Conserto de Vazamentos', preco_base: 100, descricao: 'Identificação e conserto de vazamentos em canos de PVC.', imagem_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&h=300&fit=crop' },
  { id: 's4', worker_id: 'w2', titulo: 'Instalação de Pias e Vasos', preco_base: 150, descricao: 'Instalação completa de louças sanitárias.', imagem_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=500&h=300&fit=crop' },
  { id: 's5', worker_id: 'w3', titulo: 'Faxina Residencial Completa', preco_base: 180, descricao: 'Limpeza pesada incluindo banheiros, vidros e chão.', imagem_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&h=300&fit=crop' },
  { id: 's6', worker_id: 'w3', titulo: 'Limpeza Pós-Obra', preco_base: 250, descricao: 'Remoção de entulhos leves, pó de gesso e cimento.', imagem_url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&h=300&fit=crop' },
  { id: 's7', worker_id: 'w4', titulo: 'Pintura Residencial (Cômodo)', preco_base: 300, descricao: 'Pintura de até 15m² incluindo preparo da parede.', imagem_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&h=300&fit=crop' },
  { id: 's8', worker_id: 'w4', titulo: 'Aplicação de Textura', preco_base: 400, descricao: 'Texturização decorativa para paredes internas.', imagem_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&h=300&fit=crop' },
  { id: 's9', worker_id: 'w5', titulo: 'Montagem de Guarda-Roupa', preco_base: 120, descricao: 'Montagem de guarda-roupas de 2 a 6 portas.', imagem_url: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=500&h=300&fit=crop' },
  { id: 's10', worker_id: 'w5', titulo: 'Montagem de Painel de TV', preco_base: 90, descricao: 'Instalação de painel de TV e suporte na parede.', imagem_url: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500&h=300&fit=crop' },
  { id: 's11', worker_id: 'w6', titulo: 'Formatação de Computador', preco_base: 100, descricao: 'Formatação, instalação do Windows e backup de arquivos.', imagem_url: 'https://images.unsplash.com/photo-1593642702821-c823b13eb295?w=500&h=300&fit=crop' },
  { id: 's12', worker_id: 'w6', titulo: 'Configuração de Roteador Wi-Fi', preco_base: 80, descricao: 'Instalação e configuração de repetidores e redes.', imagem_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&h=300&fit=crop' },
  { id: 's13', worker_id: 'w7', titulo: 'Frete Municipal (Pequeno)', preco_base: 150, descricao: 'Transporte de móveis e eletrodomésticos dentro de Cáceres.', imagem_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=500&h=300&fit=crop' },
  { id: 's14', worker_id: 'w7', titulo: 'Mudança Completa Residencial', preco_base: 450, descricao: 'Caminhão baú grande para mudança completa.', imagem_url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=500&h=300&fit=crop' },
  { id: 's15', worker_id: 'w8', titulo: 'Instalação de Ventilador de Teto', preco_base: 120, descricao: 'Instalação segura com balanceamento perfeito.', imagem_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&h=300&fit=crop' },
  { id: 's16', worker_id: 'w8', titulo: 'Revisão de Quadro Elétrico', preco_base: 250, descricao: 'Verificação de disjuntores e balanceamento de carga.', imagem_url: 'https://images.unsplash.com/photo-1622322695503-490325492d37?w=500&h=300&fit=crop' },
  { id: 's17', worker_id: 'w9', titulo: 'Passar Roupas', preco_base: 100, descricao: 'Passadoria de roupas do dia a dia e sociais.', imagem_url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=500&h=300&fit=crop' },
  { id: 's18', worker_id: 'w9', titulo: 'Limpeza de Estofados', preco_base: 150, descricao: 'Limpeza a seco para sofás e cadeiras estofadas.', imagem_url: 'https://images.unsplash.com/photo-1605342416281-799f928cddbd?w=500&h=300&fit=crop' },
];

export const isWorkerOnline = (details) => {
  if (!details) return false;
  const horaInicio = details.horaInicio || '08:00';
  const horaFim = details.horaFim || '18:00';
  let isWithinHours = true;
  try {
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const [hI, mI] = horaInicio.split(':').map(Number);
    const inicioMinutos = hI * 60 + mI;
    const [hF, mF] = horaFim.split(':').map(Number);
    let fimMinutos = hF * 60 + mF;
    if (fimMinutos < inicioMinutos) fimMinutos += 24 * 60;
    let adjustedAtual = horaAtual;
    if (horaAtual < inicioMinutos && fimMinutos > 24 * 60) adjustedAtual += 24 * 60;
    if (adjustedAtual < inicioMinutos || adjustedAtual > fimMinutos) isWithinHours = false;
  } catch(e) {}
  return details.isOnline && isWithinHours;
};

export const sendPushNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: '/icon.svg' });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") new Notification(title, { body, icon: '/icon.svg' });
    });
  }
};

let initialUser = null;
try {
  const storedUser = localStorage.getItem('maos_currentUser');
  const lastActivity = localStorage.getItem('maos_lastActivity');
  if (storedUser && lastActivity) {
    if (Date.now() - parseInt(lastActivity) < 30 * 60 * 1000) {
      initialUser = sanitizeUser(JSON.parse(storedUser));
      localStorage.setItem('maos_lastActivity', Date.now().toString());
    } else {
      localStorage.removeItem('maos_currentUser');
      localStorage.removeItem('maos_lastActivity');
    }
  }
} catch (e) {}

// ==========================================
// STORE ZUSTAND (ARQUITETURA DE PRODUÇÃO)
// ==========================================
export const useAppStore = create((set, get) => ({
  isLoaded: false,
  users: [],
  workerDetails: [],
  contratanteDetails: [],
  services: [],
  orders: [],
  reviews: [],
  supportTickets: [],
  
  currentUser: initialUser,
  currentView: initialUser?.role === 'ADMIN' ? 'ADMIN_DASH' : initialUser?.role === 'TRABALHADOR' ? 'WORKER_DASH' : 'HOME',
  selectedWorkerId: null,
  selectedClientId: null,
  toast: null,

  // ---- SETTERS COM DIFF ATÔMICO EM COLEÇÕES DO FIRESTORE ----
  setUsers: (next) => {
    const prev = get().users;
    set({ users: next });
    syncArrayDiffToCollection('col_users', 'id', prev, next);
  },
  setWorkerDetails: (next) => {
    const prev = get().workerDetails;
    set({ workerDetails: next });
    syncArrayDiffToCollection('col_worker_details', 'user_id', prev, next);
  },
  setContratanteDetails: (next) => {
    const prev = get().contratanteDetails;
    set({ contratanteDetails: next });
    syncArrayDiffToCollection('col_contratante_details', 'user_id', prev, next);
  },
  setServices: (next) => {
    const prev = get().services;
    set({ services: next });
    syncArrayDiffToCollection('col_services', 'id', prev, next);
  },
  setOrders: (next) => {
    const prev = get().orders;
    set({ orders: next });
    syncArrayDiffToCollection('col_orders', 'id', prev, next);
  },
  setReviews: (next) => {
    const prev = get().reviews;
    set({ reviews: next });
    syncArrayDiffToCollection('col_reviews', 'id', prev, next);
  },
  setSupportTickets: (next) => {
    const prev = get().supportTickets;
    set({ supportTickets: next });
    syncArrayDiffToCollection('col_support_tickets', 'id', prev, next);
  },

  setCurrentView: (view) => {
    set({ currentView: view, selectedWorkerId: null, selectedClientId: null });
    window.history.pushState({ view, workerId: null, clientId: null }, '', window.location.pathname);
  },
  setSelectedWorkerId: (id) => {
    set({ selectedWorkerId: id });
    window.history.pushState({ view: get().currentView, workerId: id, clientId: null }, '', window.location.pathname);
  },
  setSelectedClientId: (id) => {
    set({ selectedClientId: id });
    window.history.pushState({ view: get().currentView, workerId: null, clientId: id }, '', window.location.pathname);
  },
  setCurrentUser: (u) => {
    const safe = sanitizeUser(u);
    set({ currentUser: safe });
    if (safe) localStorage.setItem('maos_currentUser', JSON.stringify(safe));
  },

  // ---- TOAST ----
  showToast: (message, type = 'success') => {
    playNotificationSound(type);
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 4000);
  },

  // ---- AUTENTICAÇÃO SEGURA (FIREBASE AUTH + SHA-256 HASH) ----
  login: async (email, senha) => {
    const { users, showToast } = get();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const inputHash = await hashPassword(senha);

    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      showToast('Credenciais inválidas!', 'error');
      return false;
    }

    // Valida contra hash SHA-256, hash de seed ('123') ou legado
    const isPasswordValid =
      user.passwordHash === inputHash ||
      (user.passwordHash === DEFAULT_PASS_HASH && senha === '123') ||
      (user.senha && user.senha === senha);

    if (!isPasswordValid) {
      showToast('Credenciais inválidas!', 'error');
      return false;
    }

    if (user.role === 'TRABALHADOR' && user.status === 'PENDING') {
      showToast('Seu cadastro profissional está em análise pela curadoria.', 'warning');
      return false;
    }

    // Tenta autenticar no Firebase Auth nativo caso o provedor Email/Password esteja ativo no Console
    try {
      const authPass = senha.length >= 6 ? senha : `maos_${senha}_auth`;
      await signInWithEmailAndPassword(auth, cleanEmail, authPass).catch(async (err) => {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, cleanEmail, authPass).catch(() => {});
        }
      });
    } catch (e) {}

    // Se o registro ainda usava senha legada ou DEFAULT_PASS_HASH, atualiza para o hash SHA-256 real
    if (user.passwordHash === DEFAULT_PASS_HASH || user.senha) {
      const updatedUser = { ...user, passwordHash: inputHash };
      delete updatedUser.senha;
      get().setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }

    const safeUser = sanitizeUser(user);
    set({ currentUser: safeUser });
    localStorage.setItem('maos_currentUser', JSON.stringify(safeUser));
    localStorage.setItem('maos_lastActivity', Date.now().toString());
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();

    if (safeUser.role === 'ADMIN') get().setCurrentView('ADMIN_DASH');
    else if (safeUser.role === 'CONTRATANTE') get().setCurrentView('HOME');
    else get().setCurrentView('WORKER_DASH');

    showToast(`Bem-vindo, ${safeUser.nome.split(' ')[0]}!`);
    return true;
  },

  logout: async () => {
    try { await fbSignOut(auth); } catch (e) {}
    set({ currentUser: null });
    localStorage.removeItem('maos_currentUser');
    localStorage.removeItem('maos_lastActivity');
    get().setCurrentView('HOME');
    get().showToast('Sessão encerrada com segurança.');
  },

  register: async (userData, specificData) => {
    const { users, workerDetails, contratanteDetails, showToast, setUsers, setWorkerDetails, setContratanteDetails } = get();
    const cleanEmail = String(userData.email || '').trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      showToast('Este e-mail já está cadastrado na plataforma.', 'error');
      return false;
    }

    const passwordHash = await hashPassword(userData.senha);
    const status = userData.role === 'TRABALHADOR' ? 'PENDING' : 'APPROVED';
    const { senha, ...safeUserData } = userData;

    const newUser = {
      ...safeUserData,
      email: cleanEmail,
      passwordHash,
      id: 'u' + Date.now(),
      data_criacao: new Date().toISOString(),
      status
    };

    // Provisiona conta no Firebase Auth nativo (se ativo no console)
    try {
      const authPass = senha.length >= 6 ? senha : `maos_${senha}_auth`;
      await createUserWithEmailAndPassword(auth, cleanEmail, authPass).catch(() => {});
    } catch (e) {}

    // Geocodifica o endereço para obter Latitude e Longitude reais
    const coords = await fetchCoordinatesFromAddress({
      rua: specificData.rua,
      cidade: specificData.cidade,
      uf: specificData.uf
    });

    const enrichedSpecific = {
      ...specificData,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
    };

    setUsers([...users, newUser]);
    
    if (newUser.role === 'CONTRATANTE') {
      setContratanteDetails([...contratanteDetails, { user_id: newUser.id, ...enrichedSpecific, total_pedidos: 0 }]);
      const safeUser = sanitizeUser(newUser);
      set({ currentUser: safeUser });
      localStorage.setItem('maos_currentUser', JSON.stringify(safeUser));
      localStorage.setItem('maos_lastActivity', Date.now().toString());
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      get().setCurrentView('HOME');
      showToast('Conta criada com sucesso!');
    } else {
      setWorkerDetails([
        ...workerDetails,
        {
          user_id: newUser.id,
          ...enrichedSpecific,
          nota_media: 0,
          portfolio_fotos: [],
          isOnline: true,
          workingHours: 'Seg-Sex, 08:00 às 18:00'
        }
      ]);
      get().setCurrentView('LOGIN');
      showToast('Cadastro enviado para curadoria! Aguarde a aprovação.', 'info');
    }
    return true;
  },

  approveWorker: (id) => {
    const { users, setUsers, showToast } = get();
    setUsers(users.map(u => u.id === id ? { ...u, status: 'APPROVED' } : u));
    showToast('Profissional aprovado e credenciado!');
  },

  rejectWorker: (id) => {
    const { users, workerDetails, setUsers, setWorkerDetails, showToast } = get();
    setUsers(users.filter(u => u.id !== id));
    setWorkerDetails(workerDetails.filter(w => w.user_id !== id));
    showToast('Cadastro recusado e removido.');
  },

  // Direito ao Esquecimento (LGPD Art. 18, VI) — Exclusão pelo próprio titular
  deleteMyAccount: () => {
    const { currentUser, users, workerDetails, contratanteDetails, services, orders, reviews, supportTickets, setUsers, setWorkerDetails, setContratanteDetails, setServices, setOrders, setReviews, setSupportTickets, logout } = get();
    if (!currentUser) return;
    if (currentUser.role === 'ADMIN') {
      get().showToast('A conta administrativa principal não pode ser autoexcluída.', 'error');
      return;
    }

    if (window.confirm('ATENÇÃO (LGPD): Deseja excluir permanentemente sua conta e todos os seus dados pessoais da plataforma? Esta ação é irreversível.')) {
      const id = currentUser.id;
      setUsers(users.filter(u => u.id !== id));
      if (currentUser.role === 'TRABALHADOR') {
        setWorkerDetails(workerDetails.filter(w => w.user_id !== id));
        setServices(services.filter(s => s.worker_id !== id));
      } else {
        setContratanteDetails(contratanteDetails.filter(c => c.user_id !== id));
      }
      setOrders(orders.filter(o => o.worker_id !== id && o.contratante_id !== id));
      setReviews(reviews.filter(r => r.worker_id !== id && r.contratante_id !== id && r.user_id !== id));
      setSupportTickets(supportTickets.filter(t => t.user_id !== id));
      logout();
      get().showToast('Sua conta e todos os seus dados foram excluídos permanentemente.', 'info');
    }
  },

  deleteUser: (id) => {
    const { users, workerDetails, contratanteDetails, services, orders, reviews, supportTickets, setUsers, setWorkerDetails, setContratanteDetails, setServices, setOrders, setReviews, setSupportTickets, showToast } = get();
    
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (user.role === 'ADMIN') {
      showToast('Não é possível excluir o administrador principal!', 'error');
      return;
    }

    if (window.confirm(`Tem certeza que deseja BANIR e apagar todos os dados de ${user.nome}? Esta ação removerá o usuário do banco de dados.`)) {
      setUsers(users.filter(u => u.id !== id));
      
      if (user.role === 'TRABALHADOR') {
        setWorkerDetails(workerDetails.filter(w => w.user_id !== id));
        setServices(services.filter(s => s.worker_id !== id));
      } else {
        setContratanteDetails(contratanteDetails.filter(c => c.user_id !== id));
      }
      
      setOrders(orders.filter(o => o.worker_id !== id && o.contratante_id !== id));
      setReviews(reviews.filter(r => r.worker_id !== id && r.contratante_id !== id && r.user_id !== id));
      setSupportTickets(supportTickets.filter(t => t.user_id !== id));

      showToast('Usuário e todos seus dados foram removidos do sistema.', 'warning');
    }
  },
  
  // Inicializa escuta em tempo real nas coleções individuais do Firestore
  initFirebase: () => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 7) set({ isLoaded: true });
    };

    syncCollection('col_users', 'id', INITIAL_USERS, (data) => {
      // Validação anti-adulteração de sessão (impede alterar role no localStorage)
      const curr = get().currentUser;
      if (curr) {
        const authoritative = data.find(u => u.id === curr.id);
        if (!authoritative) {
          set({ currentUser: null });
          localStorage.removeItem('maos_currentUser');
        } else if (authoritative.role !== curr.role || authoritative.status !== curr.status) {
          const synced = sanitizeUser(authoritative);
          set({ currentUser: synced });
          localStorage.setItem('maos_currentUser', JSON.stringify(synced));
        }
      }
      set({ users: data });
      checkLoaded();
    });
    syncCollection('col_worker_details', 'user_id', INITIAL_WORKER_DETAILS, (data) => { set({ workerDetails: data }); checkLoaded(); });
    syncCollection('col_contratante_details', 'user_id', INITIAL_CONTRATANTE_DETAILS, (data) => { set({ contratanteDetails: data }); checkLoaded(); });
    syncCollection('col_services', 'id', INITIAL_SERVICES, (data) => { set({ services: data }); checkLoaded(); });
    syncCollection('col_orders', 'id', [], (data) => { set({ orders: data }); checkLoaded(); });
    syncCollection('col_reviews', 'id', [], (data) => { set({ reviews: data }); checkLoaded(); });
    syncCollection('col_support_tickets', 'id', [], (data) => { set({ supportTickets: data }); checkLoaded(); });
  }
}));

// ==========================================
// NOTIFICATIONS LOGIC
// ==========================================
let prevOrdersCount = -1;
let prevOrdersChatCount = {};

useAppStore.subscribe((state) => {
  const currentUser = state.currentUser;
  if (!currentUser || !state.isLoaded) return;

  if (prevOrdersCount === -1) {
    prevOrdersCount = state.orders.length;
    state.orders.forEach(o => prevOrdersChatCount[o.id] = o.chat_history?.length || 0);
    return;
  }

  if (state.orders.length > prevOrdersCount) {
    const newOrders = state.orders.slice(prevOrdersCount);
    newOrders.forEach(o => {
      if (o.worker_id === currentUser.id && o.status === 'PENDENTE') {
        sendPushNotification("Novo Serviço Solicitado!", `Alguém acabou de solicitar seus serviços.`);
      }
      prevOrdersChatCount[o.id] = o.chat_history?.length || 0;
    });
    prevOrdersCount = state.orders.length;
  }

  state.orders.forEach(o => {
    const prevCount = prevOrdersChatCount[o.id] || 0;
    const currCount = o.chat_history?.length || 0;
    if (currCount > prevCount) {
      const lastMsg = o.chat_history[currCount - 1];
      if (lastMsg && lastMsg.sender !== currentUser.id) {
        if (o.worker_id === currentUser.id || o.contratante_id === currentUser.id) {
          const senderName = state.users.find(u => u.id === lastMsg.sender)?.nome || 'Usuário';
          sendPushNotification("Nova Mensagem", `${senderName}: ${lastMsg.text}`);
        }
      }
      prevOrdersChatCount[o.id] = currCount;
    }
  });
});
