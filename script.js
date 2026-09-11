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
const WHATSAPP_NUMBER = '5500000000000';
const productCatalog = {'Top Performance':{price:89.90},'Legging Modeladora':{price:129.90},'Camiseta Dry Fit':{price:79.90},'Bolsa Fitness':{price:149.90}};
const state={cart:JSON.parse(localStorage.getItem('edfitness-cart')||'[]')};
const money=(value)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function normalizeCart(){const grouped={};state.cart.forEach((item)=>{const name=item.name||item.product;if(!name)return;if(!grouped[name])grouped[name]={name,qty:0,price:productCatalog[name]?.price||Number(item.price)||0};grouped[name].qty+=Number(item.qty)||1;});state.cart=Object.values(grouped);}
function persist(){localStorage.setItem('edfitness-cart',JSON.stringify(state.cart));renderCart();}
function renderCart(){const quantity=state.cart.reduce((sum,item)=>sum+item.qty,0);cartCount.textContent=String(quantity);cartItems.innerHTML='';cartEmpty.hidden=state.cart.length>0;let total=0;state.cart.forEach((item,index)=>{total+=item.price*item.qty;const row=document.createElement('article');row.className='cart-item';row.innerHTML=`<div class="cart-item-info"><strong>${item.name}</strong><span>${money(item.price)}</span></div><div class="qty-control" aria-label="Quantidade de ${item.name}"><button type="button" data-action="minus" data-index="${index}" aria-label="Diminuir quantidade">−</button><span>${item.qty}</span><button type="button" data-action="plus" data-index="${index}" aria-label="Aumentar quantidade">+</button></div><strong class="item-subtotal">${money(item.price*item.qty)}</strong><button class="remove-item" type="button" data-action="remove" data-index="${index}">Remover</button>`;cartItems.appendChild(row);});cartTotal.textContent=money(total);checkoutButton.disabled=state.cart.length===0;}
function openCart(){cartBackdrop.hidden=false;requestAnimationFrame(()=>{cartBackdrop.classList.add('show');cartDrawer.classList.add('open');});cartDrawer.setAttribute('aria-hidden','false');document.body.classList.add('cart-open');cartClose.focus();}
function closeCart(){cartDrawer.classList.remove('open');cartBackdrop.classList.remove('show');cartDrawer.setAttribute('aria-hidden','true');document.body.classList.remove('cart-open');setTimeout(()=>{cartBackdrop.hidden=true;},220);}
let toastTimer;function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1800);}
document.querySelectorAll('.add-cart').forEach((button)=>{button.addEventListener('click',(event)=>{event.preventDefault();const name=button.dataset.product;const existing=state.cart.find((item)=>item.name===name);if(existing)existing.qty+=1;else state.cart.push({name,qty:1,price:productCatalog[name]?.price||0});persist();showToast(`${name} adicionado ao carrinho`);});});
document.querySelectorAll('[data-category]').forEach((link)=>{link.addEventListener('click',()=>sessionStorage.setItem('edfitness-category',link.dataset.category));});
cartItems.addEventListener('click',(event)=>{const button=event.target.closest('button[data-action]');if(!button)return;const index=Number(button.dataset.index);const item=state.cart[index];if(!item)return;if(button.dataset.action==='plus')item.qty+=1;if(button.dataset.action==='minus')item.qty-=1;if(button.dataset.action==='remove'||item.qty<=0)state.cart.splice(index,1);persist();});
checkoutButton.addEventListener('click',()=>{if(!state.cart.length)return;if(WHATSAPP_NUMBER==='5500000000000'){showToast('Configure o número do WhatsApp no script.js');return;}const lines=state.cart.map((item)=>`• ${item.qty}x ${item.name} — ${money(item.price*item.qty)}`);const total=state.cart.reduce((sum,item)=>sum+item.price*item.qty,0);const message=`Olá! Quero finalizar meu pedido na ED Fitness:\n\n${lines.join('\n')}\n\nTotal: ${money(total)}`;window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener');});
cartButton.addEventListener('click',openCart);cartClose.addEventListener('click',closeCart);cartBackdrop.addEventListener('click',closeCart);continueShopping.addEventListener('click',closeCart);document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&cartDrawer.classList.contains('open'))closeCart();});normalizeCart();persist();
