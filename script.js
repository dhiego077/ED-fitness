const cartCount = document.getElementById('cartCount');
const cartButton = document.getElementById('cartButton');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartTotal = document.getElementById('cartTotal');
const checkoutButton = document.getElementById('checkoutButton');
const continueShopping = document.getElementById('continueShopping');
const toast = document.getElementById('toast');

const WHATSAPP_NUMBER = '5598985236637'; // Troque por 55 + DDD + número
const productCatalog = {
  'Top Performance': { price: 89.90 },
  'Legging Modeladora': { price: 129.90 },
  'Camiseta Dry Fit': { price: 79.90 },
  'Bolsa Fitness': { price: 149.90 }
};

const state = { cart: JSON.parse(localStorage.getItem('edfitness-cart') || '[]') };
const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function normalizeCart() {
  const grouped = {};
  state.cart.forEach((item) => {
    const name = item.name || item.product;
    if (!name) return;
    if (!grouped[name]) grouped[name] = { name, qty: 0, price: productCatalog[name]?.price || Number(item.price) || 0 };
    grouped[name].qty += Number(item.qty) || 1;
  });
  state.cart = Object.values(grouped);
}

function persist() {
  localStorage.setItem('edfitness-cart', JSON.stringify(state.cart));
  renderCart();
  if (window.edFitnessFirebase?.user) window.edFitnessFirebase.saveCart(state.cart).catch(console.error);
}

function renderCart() {
  const quantity = state.cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = String(quantity);
  cartItems.innerHTML = '';
  cartEmpty.hidden = state.cart.length > 0;

  let total = 0;
  state.cart.forEach((item, index) => {
    total += item.price * item.qty;
    const row = document.createElement('article');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info"><strong>${item.name}</strong><span>${money(item.price)}</span></div>
      <div class="qty-control" aria-label="Quantidade de ${item.name}">
        <button type="button" data-action="minus" data-index="${index}" aria-label="Diminuir quantidade">−</button>
        <span>${item.qty}</span>
        <button type="button" data-action="plus" data-index="${index}" aria-label="Aumentar quantidade">+</button>
      </div>
      <strong class="item-subtotal">${money(item.price * item.qty)}</strong>
      <button class="remove-item" type="button" data-action="remove" data-index="${index}">Remover</button>`;
    cartItems.appendChild(row);
  });

  cartTotal.textContent = money(total);
  checkoutButton.disabled = state.cart.length === 0;
}

function openCart() {
  cartBackdrop.hidden = false;
  requestAnimationFrame(() => {
    cartBackdrop.classList.add('show');
    cartDrawer.classList.add('open');
  });
  cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
  cartClose.focus();
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartBackdrop.classList.remove('show');
  cartDrawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
  setTimeout(() => { cartBackdrop.hidden = true; }, 220);
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

document.querySelectorAll('.add-cart').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const name = button.dataset.product;
    const existing = state.cart.find((item) => item.name === name);
    if (existing) existing.qty += 1;
    else state.cart.push({ name, qty: 1, price: productCatalog[name]?.price || 0 });
    persist();
    showToast(`${name} adicionado ao carrinho`);
  });
});

// V10: catálogo conectado ao Firestore, com fallback para os 4 produtos atuais.
const categoryMeta = {
  tops: { title:'Tops', description:'Tops fitness para treino e rotina.' },
  leggings: { title:'Leggings', description:'Leggings fitness com conforto e performance.' },
  blusas: { title:'Blusas', description:'Blusas e camisetas para treino e lifestyle.' },
  acessorios: { title:'Acessórios', description:'Acessórios para acompanhar sua rotina fitness.' },
  macacoes_conjuntos: { title:'Macacões & Conjuntos', description:'Macacões e conjuntos fitness.' },
  tenis: { title:'Tênis', description:'Tênis para treino e rotina.' },
  suplementos: { title:'Suplementos', description:'Suplementos para complementar sua rotina.' }
};

let firestoreProducts = [];

function normalizeCategory(value=''){
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,'_').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

function productPrice(p){
  const promo=Number(p.promotionalPrice);
  return Number.isFinite(promo) && promo > 0 ? promo : Number(p.price)||0;
}

function renderCategoryProducts(key){
  const modal=document.getElementById('categoryModal');
  const title=document.getElementById('categoryTitle');
  const description=document.getElementById('categoryDescription');
  const content=document.getElementById('categoryContent');
  const meta=categoryMeta[key] || {title:key,description:''};
  if(!modal||!title||!description||!content) return;
  title.textContent=meta.title; description.textContent=meta.description;
  let list=firestoreProducts.filter(p=>normalizeCategory(p.category)===key);
  if(!list.length){
    const fallback={tops:['Top Performance',89.90],leggings:['Legging Modeladora',129.90],blusas:['Camiseta Dry Fit',79.90],acessorios:['Bolsa Fitness',149.90]}[key];
    if(fallback) list=[{id:key,name:fallback[0],price:fallback[1],image:''}];
  }
  content.innerHTML=list.length ? list.map(p=>{
    const price=productPrice(p); productCatalog[p.name]={price};
    const img=Array.isArray(p.images)?p.images[0]:(p.image||'');
    return `<article class="firebase-product-card">${img?`<img src="${img}" alt="${p.name}">`:''}<strong>${p.name}</strong><span>${money(price)}</span><button type="button" class="category-add" data-category-product="${p.name}">Adicionar ao carrinho</button></article>`;
  }).join('') : '<p>Nenhum produto publicado nesta categoria ainda.</p>';
  modal.hidden=false; document.body.classList.add('account-open');
}

async function syncFirebaseCatalog(){
  try{
    if(!window.edFitnessFirebase?.loadProducts) return;
    firestoreProducts=await window.edFitnessFirebase.loadProducts();
    firestoreProducts.forEach(p=>{ if(p.name) productCatalog[p.name]={price:productPrice(p)}; });
    window.dispatchEvent(new CustomEvent('edfitness-products-loaded',{detail:firestoreProducts}));
  }catch(err){ console.warn('Catálogo Firebase indisponível; usando catálogo local.',err); }
}
window.addEventListener('load',()=>setTimeout(syncFirebaseCatalog,150));

document.querySelectorAll('[data-category]').forEach(link=>link.addEventListener('click',event=>{
  const key=normalizeCategory(link.dataset.category); sessionStorage.setItem('edfitness-category',key);
  if(categoryMeta[key]){event.preventDefault();renderCategoryProducts(key);}
}));

document.getElementById('categoryContent')?.addEventListener('click',event=>{
  const button=event.target.closest('[data-category-product]'); if(!button)return;
  const name=button.dataset.categoryProduct; const existing=state.cart.find(item=>item.name===name);
  if(existing)existing.qty+=1; else state.cart.push({name,qty:1,price:productCatalog[name]?.price||0});
  persist(); showToast(`${name} adicionado ao carrinho`);
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.dataset.index);
  const item = state.cart[index];
  if (!item) return;
  if (button.dataset.action === 'plus') item.qty += 1;
  if (button.dataset.action === 'minus') item.qty -= 1;
  if (button.dataset.action === 'remove' || item.qty <= 0) state.cart.splice(index, 1);
  persist();
});

const checkoutModal = document.getElementById('checkoutModal');
const checkoutBackdrop = document.getElementById('checkoutBackdrop');
const checkoutClose = document.getElementById('checkoutClose');
const shippingZip = document.getElementById('shippingZip');
const calculateShipping = document.getElementById('calculateShipping');
const shippingStatus = document.getElementById('shippingStatus');
const shippingOptions = document.getElementById('shippingOptions');
const checkoutSubtotal = document.getElementById('checkoutSubtotal');
const checkoutShipping = document.getElementById('checkoutShipping');
const checkoutTotal = document.getElementById('checkoutTotal');
const confirmPurchase = document.getElementById('confirmPurchase');
let selectedShipping = null;

function cartSubtotal(){ return state.cart.reduce((sum,item)=>sum+item.price*item.qty,0); }
function refreshCheckout(){
  const subtotal=cartSubtotal();
  checkoutSubtotal.textContent=money(subtotal);
  checkoutShipping.textContent=selectedShipping?money(selectedShipping.price):'—';
  checkoutTotal.textContent=money(subtotal+(selectedShipping?.price||0));
  confirmPurchase.disabled=!selectedShipping;
}
function openCheckout(){
  closeCart(); selectedShipping=null; shippingOptions.innerHTML=''; shippingStatus.textContent='';
  if (document.getElementById('profileZip')?.value) shippingZip.value=document.getElementById('profileZip').value;
  refreshCheckout(); checkoutModal.hidden=false;
}
function closeCheckout(){ checkoutModal.hidden=true; }
checkoutButton.addEventListener('click',()=>{if(state.cart.length)openCheckout();});
checkoutClose.addEventListener('click',closeCheckout); checkoutBackdrop.addEventListener('click',closeCheckout);
calculateShipping.addEventListener('click',async()=>{
  const postalCode=shippingZip.value.replace(/\D/g,'');
  if(postalCode.length!==8){shippingStatus.textContent='Digite um CEP válido com 8 números.';return;}
  calculateShipping.disabled=true; shippingStatus.textContent='Consultando opções de entrega…'; shippingOptions.innerHTML=''; selectedShipping=null; refreshCheckout();
  try{
    const r=await fetch('/.netlify/functions/calculate-shipping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postalCode,items:state.cart.map(({name,qty})=>({name,qty}))})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.code==='ME_AUTH_REQUIRED'?'A API do Melhor Envio ainda precisa ser autorizada.':(data.error||'Não foi possível calcular o frete.'));
    if(!data.quotes?.length) throw new Error('Nenhuma opção de entrega disponível para esse CEP.');
    shippingStatus.textContent='Escolha uma opção de entrega:';
    data.quotes.forEach((q,idx)=>{const label=document.createElement('label');label.className='shipping-option';label.innerHTML=`<input type="radio" name="shipping" value="${idx}"><span class="ship-copy"><strong>${q.company ? q.company+' — ' : ''}${q.name}</strong><small>Prazo estimado: ${q.deliveryTime} dia(s)</small></span><strong>${money(q.price)}</strong>`;label.querySelector('input').addEventListener('change',()=>{selectedShipping=q;refreshCheckout();});shippingOptions.appendChild(label);});
  }catch(e){shippingStatus.textContent=e.message;}finally{calculateShipping.disabled=false;}
});
confirmPurchase.addEventListener('click',async()=>{
  if(!selectedShipping)return;
  confirmPurchase.disabled=true; confirmPurchase.textContent='Validando pedido…';
  try{
    const r=await fetch('/.netlify/functions/checkout-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:state.cart.map(({name,qty})=>({name,qty})),shipping:{id:selectedShipping.id,price:selectedShipping.price}})});
    const summary=await r.json(); if(!r.ok)throw new Error(summary.error||'Falha ao validar pedido.');
    const checkoutData={items:state.cart,shipping:selectedShipping,postalCode:shippingZip.value,summary};
    sessionStorage.setItem('edfitness-checkout',JSON.stringify(checkoutData));
    shippingStatus.textContent=`Pedido validado: ${money(summary.total)}. Escolha a forma de pagamento abaixo.`;
    await renderMercadoPagoPayment(checkoutData);
  }catch(e){shippingStatus.textContent=e.message;}finally{confirmPurchase.disabled=false;confirmPurchase.textContent='Confirmar valor e ir para pagamento';}
});


const paymentArea=document.getElementById('paymentArea');
const paymentStatus=document.getElementById('paymentStatus');
const paymentResult=document.getElementById('paymentResult');
let paymentBrickController=null;
let activePaymentMethod=null;
const payerForm=document.getElementById('payerForm');
const boletoAddress=document.getElementById('boletoAddress');
const cardPaymentContainer=document.getElementById('cardPaymentBrick_container');
const methodChooser=document.getElementById('paymentMethodChooser');

function paymentResultHtml(data){
  const orderId=data.id||'';
  const pay=data.transactions?.payments?.[0]||{};
  const pm=pay.payment_method||{};
  const status=pay.status||data.status||'processando';
  let extra='';
  if(pm.qr_code_base64) extra+=`<img alt="QR Code Pix" class="pix-qr" src="data:image/png;base64,${pm.qr_code_base64}">`;
  if(pm.qr_code) extra+=`<label class="pix-copy-label">Pix copia e cola<textarea readonly>${pm.qr_code}</textarea></label>`;
  if(pm.ticket_url) extra+=`<a class="payment-link" href="${pm.ticket_url}" target="_blank" rel="noopener">Abrir pagamento</a>`;
  if(pm.barcode_content) extra+=`<label class="pix-copy-label">Código do boleto<textarea readonly>${pm.barcode_content}</textarea></label>`;
  return `<strong>Pagamento ${status}</strong>${orderId?`<span>Pedido Mercado Pago: ${orderId}</span>`:''}${extra}`;
}

function payerPayload(){
  return {
    first_name:document.getElementById('payerFirstName').value.trim(),
    last_name:document.getElementById('payerLastName').value.trim(),
    email:document.getElementById('payerEmail').value.trim(),
    identification:{type:'CPF',number:document.getElementById('payerCpf').value.replace(/\D/g,'')},
    address:{
      zip_code:document.getElementById('shippingZip').value.replace(/\D/g,''),
      street_name:document.getElementById('payerStreet').value.trim(),
      street_number:document.getElementById('payerNumber').value.trim(),
      neighborhood:document.getElementById('payerNeighborhood').value.trim(),
      city:document.getElementById('payerCity').value.trim(),
      state:document.getElementById('payerState').value.trim().toUpperCase()
    }
  };
}

async function sendOrder(method,checkoutData,extra={}){
  paymentStatus.textContent='Processando pagamento…';
  const resp=await fetch('/.netlify/functions/process-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentMethod:method,checkout:checkoutData,payer:payerPayload(),...extra})});
  const data=await resp.json();
  if(!resp.ok) throw new Error(data.error||data.message||'Pagamento não autorizado.');
  paymentResult.innerHTML=paymentResultHtml(data); paymentResult.hidden=false; paymentStatus.textContent='';
  return data;
}

async function renderCardBrick(checkoutData){
  payerForm.hidden=true;
  cardPaymentContainer.innerHTML='';
  const cardFormEl=document.getElementById('cardFormCheckout');
  cardFormEl.hidden=false;
  paymentStatus.classList.remove('error');
  paymentStatus.textContent='Carregando formulário seguro de cartão…';
  const cfgRes=await fetch('/.netlify/functions/mp-config',{cache:'no-store'});
  const cfg=await cfgRes.json();
  if(!cfgRes.ok||!cfg.publicKey) throw new Error(cfg.error||'Mercado Pago não configurado.');
  if(typeof MercadoPago==='undefined') throw new Error('SDK do Mercado Pago não carregou.');
  const mp=new MercadoPago(String(cfg.publicKey).trim(),{locale:'pt-BR'});
  if(window.edCardForm){try{window.edCardForm.unmount?.();}catch(_){ } window.edCardForm=null;}
  window.edCardForm=mp.cardForm({
    amount:String(Number(checkoutData.summary.total).toFixed(2)),
    iframe:true,
    form:{
      id:'cardFormCheckout',
      cardNumber:{id:'cardFormNumber',placeholder:'Número do cartão'},
      expirationDate:{id:'cardFormExpiration',placeholder:'MM/AA'},
      securityCode:{id:'cardFormSecurity',placeholder:'CVV'},
      cardholderName:{id:'cardFormHolder',placeholder:'Nome como no cartão'},
      issuer:{id:'cardFormIssuer',placeholder:'Banco emissor'},
      installments:{id:'cardFormInstallments',placeholder:'Parcelas'},
      identificationType:{id:'cardFormIdentificationType',placeholder:'Tipo de documento'},
      identificationNumber:{id:'cardFormIdentificationNumber',placeholder:'CPF'},
      cardholderEmail:{id:'cardFormEmail',placeholder:'E-mail'}
    },
    callbacks:{
      onFormMounted:error=>{if(error){console.error('Mercado Pago CardForm:',error);paymentStatus.classList.add('error');paymentStatus.textContent='Não foi possível carregar o cartão: '+(error.message||'erro do Mercado Pago');return;}paymentStatus.textContent='Preencha os dados do cartão.';},
      onSubmit:async event=>{
        event.preventDefault();
        const submit=document.getElementById('cardFormSubmit');
        submit.disabled=true; submit.textContent='Processando…';
        paymentStatus.textContent='Enviando pagamento com cartão…';
        try{
          const d=window.edCardForm.getCardFormData();
          const payer={email:d.cardholderEmail||'',identification:{type:d.identificationType||'CPF',number:d.identificationNumber||''}};
          const card={token:d.token,payment_method_id:d.paymentMethodId,issuer_id:d.issuerId,installments:Number(d.installments)||1};
          const resp=await fetch('/.netlify/functions/process-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentMethod:'card',checkout:checkoutData,payer,card})});
          const data=await resp.json(); if(!resp.ok) throw new Error(data.error||data.message||'Pagamento não autorizado.');
          paymentResult.innerHTML=paymentResultHtml(data);paymentResult.hidden=false;paymentStatus.textContent='';
        }catch(err){console.error('Falha no cartão:',err);paymentStatus.classList.add('error');paymentStatus.textContent=err.message||'Não foi possível processar o cartão.';}
        finally{submit.disabled=false;submit.textContent='Pagar com cartão';}
      },
      onFetching:resource=>{const progress=document.getElementById('cardFormProgress');progress.removeAttribute('value');return()=>progress.setAttribute('value','0');}
    }
  });
}

async function renderMercadoPagoPayment(checkoutData){
  paymentArea.hidden=false; paymentResult.hidden=true; paymentResult.innerHTML=''; paymentStatus.textContent='Escolha Pix, boleto ou cartão.';
  payerForm.hidden=true; boletoAddress.hidden=true; cardPaymentContainer.innerHTML=''; document.getElementById('cardFormCheckout').hidden=true; activePaymentMethod=null;
  paymentArea.scrollIntoView({behavior:'smooth',block:'nearest'});
  methodChooser.onclick=async(e)=>{
    const btn=e.target.closest('[data-method]'); if(!btn) return;
    activePaymentMethod=btn.dataset.method;
    paymentResult.hidden=true; paymentResult.innerHTML='';
    if(activePaymentMethod==='card'){
      try{await renderCardBrick(checkoutData);}catch(err){console.error(err);paymentStatus.textContent='Cartão indisponível neste teste. Use Pix ou boleto enquanto validamos a Public Key.';}
      return;
    }
    if(paymentBrickController){try{await paymentBrickController.unmount();}catch(_){ } paymentBrickController=null;}
    cardPaymentContainer.innerHTML=''; document.getElementById('cardFormCheckout').hidden=true; payerForm.hidden=false; boletoAddress.hidden=activePaymentMethod!=='boleto';
    for(const el of boletoAddress.querySelectorAll('input')) el.required=activePaymentMethod==='boleto';
    document.getElementById('payPixBoleto').textContent=activePaymentMethod==='pix'?'Gerar Pix':'Gerar boleto';
    paymentStatus.textContent=activePaymentMethod==='pix'?'Preencha seus dados para gerar o Pix.':'Preencha seus dados e endereço para gerar o boleto.';
  };
  const payPixBoleto=document.getElementById('payPixBoleto');
  const submitPixBoleto=async(e)=>{
    if(e) e.preventDefault();
    if(!activePaymentMethod||activePaymentMethod==='card') return;
    paymentStatus.classList.remove('error');
    paymentStatus.textContent='Enviando '+(activePaymentMethod==='pix'?'Pix':'boleto')+'…';
    payPixBoleto.disabled=true;
    const originalText=payPixBoleto.textContent;
    payPixBoleto.textContent='Processando…';
    try{
      await sendOrder(activePaymentMethod,checkoutData);
    }catch(err){
      console.error('Falha ao criar pagamento:',err);
      paymentStatus.classList.add('error');
      paymentStatus.textContent=err.message||'Não foi possível criar o pagamento.';
    }finally{
      payPixBoleto.disabled=false;
      payPixBoleto.textContent=activePaymentMethod==='pix'?'Gerar Pix':'Gerar boleto';
    }
  };
  payerForm.onsubmit=submitPixBoleto;
  payPixBoleto.onclick=submitPixBoleto;
}

cartButton.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
continueShopping.addEventListener('click', closeCart);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && cartDrawer.classList.contains('open')) closeCart(); });

normalizeCart();
persist();

window.addEventListener('edfitness-auth', async (event) => {
  if (!event.detail || !window.edFitnessFirebase) return;
  try { const cloudCart = await window.edFitnessFirebase.loadCart(); if (Array.isArray(cloudCart) && cloudCart.length) { state.cart = cloudCart; normalizeCart(); localStorage.setItem('edfitness-cart', JSON.stringify(state.cart)); renderCart(); } else if (state.cart.length) await window.edFitnessFirebase.saveCart(state.cart); } catch (e) { console.error('Falha ao sincronizar carrinho:', e); }
});

// Conta: abre o modal independentemente do carregamento do Firebase.
(() => {
  const accountButton = document.getElementById('accountButton');
  const accountModal = document.getElementById('accountModal');
  const accountClose = document.getElementById('accountClose');
  const accountBackdrop = document.getElementById('accountBackdrop');
  if (!accountButton || !accountModal) return;
  const open = () => { accountModal.hidden = false; document.body.classList.add('account-open'); };
  const close = () => { accountModal.hidden = true; document.body.classList.remove('account-open'); };
  accountButton.addEventListener('click', open);
  accountClose?.addEventListener('click', close);
  accountBackdrop?.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !accountModal.hidden) close(); });
})();

// V6: abas adicionais de categorias.
(() => {
  const modal = document.getElementById('categoryModal');
  const title = document.getElementById('categoryTitle');
  const description = document.getElementById('categoryDescription');
  const close = document.getElementById('categoryClose');
  const backdrop = document.getElementById('categoryBackdrop');
  const categories = {
    'macacoes-conjuntos': ['Macacões & Conjuntos Fitness', 'Looks completos para treino, academia e rotina fitness.'],
    'tenis': ['Tênis', 'Calçados esportivos e modelos para treino e lifestyle.'],
    'suplementos': ['Suplementos', 'Categoria preparada para suplementos e produtos de nutrição esportiva.']
  };
  const hide = () => { modal.hidden = true; document.body.classList.remove('account-open'); };
  document.querySelectorAll('[data-extra-category]').forEach(btn => btn.addEventListener('click', () => {
    const data = categories[btn.dataset.extraCategory];
    if (!data) return;
    title.textContent = data[0]; description.textContent = data[1];
    modal.hidden = false; document.body.classList.add('account-open');
  }));
  close?.addEventListener('click', hide); backdrop?.addEventListener('click', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) hide(); });
})();
