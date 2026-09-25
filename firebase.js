import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, addDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDlbk24PnijEVCYQS_3fe26SF_WTC7t_S0',
  authDomain: 'ed-fitness-1398d.firebaseapp.com',
  projectId: 'ed-fitness-1398d',
  storageBucket: 'ed-fitness-1398d.firebasestorage.app',
  messagingSenderId: '22921993850',
  appId: '1:22921993850:web:d45223dc43dedc1a8f65c3',
  measurementId: 'G-CFB0BV3XF0'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});

const $ = (id) => document.getElementById(id);
const modal = $('accountModal');
const form = $('authForm');
const profileForm = $('profileForm');
const authView = $('authView');
const profileView = $('profileView');
const authMessage = $('authMessage');
let mode = 'login';
let currentUser = null;

function openAccount(){ modal.hidden = false; document.body.classList.add('account-open'); }
function closeAccount(){ modal.hidden = true; document.body.classList.remove('account-open'); }
function message(text, error=false){ authMessage.textContent=text; authMessage.classList.toggle('error', error); }
function setMode(next){ mode=next; $('authTitle').textContent=mode==='login'?'Entrar na sua conta':'Criar sua conta'; $('nameField').hidden=mode==='login'; $('authSubmit').textContent=mode==='login'?'Entrar':'Criar conta'; $('authSwitch').textContent=mode==='login'?'Ainda não tem conta? Cadastre-se':'Já tem conta? Entrar'; message(''); }

$('authSwitch').addEventListener('click', () => setMode(mode==='login'?'register':'login'));
$('logoutButton').addEventListener('click', () => signOut(auth));

form.addEventListener('submit', async (e) => {
  e.preventDefault(); message('');
  const email=$('authEmail').value.trim(), password=$('authPassword').value, name=$('authName').value.trim();
  try {
    if(mode==='register'){
      if(!name) throw new Error('Informe seu nome.');
      const cred=await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(cred.user,{displayName:name});
      await setDoc(doc(db,'users',cred.user.uid),{name,email,phone:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
    } else await signInWithEmailAndPassword(auth,email,password);
    form.reset();
    // Após login/cadastro bem-sucedido, fecha a janela de conta.
    // O perfil continua salvo e pode ser aberto manualmente pelo ícone da conta quando o usuário quiser editar os dados.
    closeAccount();
  } catch(err){
    const friendly = err.code==='auth/email-already-in-use'?'Este e-mail já está cadastrado.':err.code==='auth/invalid-credential'?'E-mail ou senha inválidos.':err.code==='auth/weak-password'?'Use uma senha com pelo menos 6 caracteres.':err.code==='auth/invalid-email'?'Informe um e-mail válido.':err.message;
    message(friendly,true);
  }
});

profileForm.addEventListener('submit', async(e)=>{
  e.preventDefault(); if(!currentUser) return;
  const data={name:$('profileName').value.trim(),email:currentUser.email,phone:$('profilePhone').value.trim(),address:{zip:$('profileZip').value.trim(),street:$('profileStreet').value.trim(),number:$('profileNumber').value.trim(),city:$('profileCity').value.trim(),state:$('profileState').value.trim()},updatedAt:serverTimestamp()};
  await setDoc(doc(db,'users',currentUser.uid),data,{merge:true});
  $('profileStatus').textContent='Dados salvos com segurança.';
});

async function loadProfile(user){
  const snap=await getDoc(doc(db,'users',user.uid)); const d=snap.exists()?snap.data():{};
  $('profileName').value=d.name||user.displayName||''; $('profileEmail').value=user.email||''; $('profilePhone').value=d.phone||'';
  $('profileZip').value=d.address?.zip||''; $('profileStreet').value=d.address?.street||''; $('profileNumber').value=d.address?.number||''; $('profileCity').value=d.address?.city||''; $('profileState').value=d.address?.state||'';
}

onAuthStateChanged(auth, async user=>{
  currentUser=user; authView.hidden=!!user; profileView.hidden=!user; $('accountButton').classList.toggle('logged-in',!!user); $('accountButton').setAttribute('aria-label',user?'Abrir minha conta':'Entrar ou criar conta');
  if(user){ await loadProfile(user); window.dispatchEvent(new CustomEvent('edfitness-auth',{detail:{uid:user.uid}})); }
  else window.dispatchEvent(new CustomEvent('edfitness-auth',{detail:null}));
});



// Catálogo dinâmico: produtos publicados no Firestore.
async function loadProducts(){
  const snap = await getDocs(query(collection(db,'products'), where('active','==',true)));
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

window.edFitnessFirebase={
  get user(){return currentUser;},
  loadProducts,
  async saveCart(cart){ if(!currentUser) return; await setDoc(doc(db,'users',currentUser.uid,'private','cart'),{items:cart,updatedAt:serverTimestamp()}); },
  async loadCart(){ if(!currentUser) return null; const s=await getDoc(doc(db,'users',currentUser.uid,'private','cart')); return s.exists()?s.data().items:null; },
  async saveOrder(cart,total){ if(!currentUser) return null; return addDoc(collection(db,'users',currentUser.uid,'orders'),{items:cart,total,status:'whatsapp_pending',createdAt:serverTimestamp()}); }
};
