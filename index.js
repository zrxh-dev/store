// --- CONFIGURATION ---
const ADMIN_CODE = "admin123";
const SELLER_CODE = "seller123";
const WHATSAPP_NUMBER = "60123456789"; 

// --- CURRENCY ---
let activeCurrency = localStorage.getItem('currency') || 'USD';
const rates = { 'USD': 1, 'MYR': 4.5, 'IDR': 16000 };
const symbols = { 'USD': '$', 'MYR': 'RM', 'IDR': 'Rp ' };

// --- FIREBASE INIT ---
const firebaseConfig = {
    apiKey: "AIzaSyBcr6YxzsZ475J3c1rnQsuV7MWecxbRJ1E",
    authDomain: "aiapp-18eb8.firebaseapp.com",
    projectId: "aiapp-18eb8",
    storageBucket: "aiapp-18eb8.firebasestorage.app",
    messagingSenderId: "73094131400",
    appId: "1:73094131400:web:af6534a9768d429b05fffd",
    measurementId: "G-BQQE0BGQ8X"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- STATE ---
let userRole = localStorage.getItem('storeRole') || 'buyer';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let productsMap = {}; // CRITICAL: Stores product data for clicks

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currency-select').value = activeCurrency;
    lucide.createIcons();
    loadProducts();
    updateCartUI();
});

// --- NAVIGATION ---
window.switchTab = function(tab) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    if(tab === 'dashboard') loadDashboard();
    if(tab === 'home') loadProducts();
}

// --- CATALOGUE ---
window.loadProducts = function() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '<div class="col-span-full text-center mt-10 text-gray-400">Loading...</div>';

    db.collection('products').where('status', '==', 'approved').get().then(snap => {
        grid.innerHTML = '';
        productsMap = {}; // Reset map

        if(snap.empty) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-400">No items found.</div>';
            return;
        }

        snap.forEach(doc => {
            const p = doc.data();
            const id = doc.id;
            productsMap[id] = { id, ...p }; // Save to memory

            // SHOPEE STYLE CARD
            grid.innerHTML += `
                <div class="shopee-card" onclick="openModal('${id}')">
                    <div class="card-img-container">
                        <img src="${p.image}" class="card-img" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <div class="card-info">
                        <div class="text-sm text-gray-800 font-normal leading-tight line-clamp-2 mb-1">${p.name}</div>
                        
                        <div class="mt-auto">
                            <div class="text-orange-600 font-bold text-base">${formatPrice(p.price)}</div>
                            <div class="text-[10px] text-gray-400 truncate mt-1">By ${p.seller}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

// --- MODAL (POPUP) ---
window.openModal = function(id) {
    const p = productsMap[id];
    if(!p) return;

    document.getElementById('modal-img').src = p.image;
    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-price').textContent = formatPrice(p.price);
    document.getElementById('modal-seller').textContent = `Publisher: ${p.seller}`;
    document.getElementById('modal-desc').textContent = p.description || "No description.";

    // Logic to update Add Button (clone to remove old listeners)
    const btn = document.getElementById('modal-add-btn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = () => {
        addToCart(p.id, p.name, p.price, p.image);
        closeModal();
    };

    // Animation classes
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-95');
}

window.closeModal = function() {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');
    modal.classList.add('opacity-0', 'pointer-events-none');
    content.classList.add('scale-95');
}

// --- CART ---
window.addToCart = function(id, name, price, image) {
    const existing = cart.find(i => i.id === id);
    if(existing) existing.qty++;
    else cart.push({ id, name, price, image, qty: 1 });
    
    saveCart();
    showToast("Added to Cart!");
}

window.updateQty = function(id, delta) {
    const item = cart.find(i => i.id === id);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

window.updateCartUI = function() {
    const count = cart.reduce((acc, i) => acc + i.qty, 0);
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-count').classList.toggle('hidden', count === 0);

    const container = document.getElementById('cart-items');
    let totalUSD = 0;
    container.innerHTML = '';

    if(cart.length === 0) container.innerHTML = '<div class="text-center text-gray-400 mt-10">Cart is empty.</div>';
    else {
        cart.forEach(item => {
            totalUSD += item.price * item.qty;
            container.innerHTML += `
                <div class="flex items-center gap-3 bg-gray-50 p-2 rounded border">
                    <img src="${item.image}" class="w-16 h-16 object-cover rounded bg-white">
                    <div class="flex-1">
                        <div class="text-sm font-bold line-clamp-1">${item.name}</div>
                        <div class="text-xs text-orange-600 font-bold">${formatPrice(item.price)}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="updateQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center bg-white border rounded shadow-sm hover:text-red-500">-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="updateQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center bg-black text-white rounded shadow-sm">+</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cart-total').textContent = formatPrice(totalUSD);
}

window.checkoutWhatsApp = function() {
    if(cart.length === 0) return alert("Empty!");
    let msg = "Order Request:%0A";
    let total = 0;
    cart.forEach(i => {
        total += i.price * i.qty;
        msg += `- ${i.name} (x${i.qty}) ${formatPrice(i.price)}%0A`;
    });
    msg += `%0A*Total: ${formatPrice(total)}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// --- ADMIN / DASHBOARD ---
window.loadDashboard = function() {
    document.getElementById('dashboard-role').textContent = userRole;
    if(userRole === 'buyer') { switchTab('login'); return; }

    const pendingDiv = document.getElementById('admin-approvals');
    const pList = document.getElementById('pending-list');
    const mList = document.getElementById('manage-list');

    if(userRole === 'admin') {
        pendingDiv.classList.remove('hidden');
        db.collection('products').where('status', '==', 'pending').get().then(snap => {
            pList.innerHTML = snap.empty ? '<div class="text-xs text-gray-400">None.</div>' : '';
            snap.forEach(doc => {
                const p = doc.data();
                pList.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                        <div class="text-sm">${p.name} <span class="text-xs text-gray-500">($${p.price})</span></div>
                        <div class="flex gap-2">
                            <button onclick="setStatus('${doc.id}', 'approved')" class="text-green-500"><i data-lucide="check" class="w-4 h-4"></i></button>
                            <button onclick="delProd('${doc.id}')" class="text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            });
            lucide.createIcons();
        });
    } else { pendingDiv.classList.add('hidden'); }

    db.collection('products').where('status', '==', 'approved').get().then(snap => {
        mList.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            mList.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                    <div class="flex items-center gap-2">
                        <img src="${p.image}" class="w-8 h-8 object-cover rounded">
                        <div class="text-sm truncate w-32">${p.name}</div>
                    </div>
                    ${userRole === 'admin' ? `<button onclick="delProd('${doc.id}')" class="text-red-400"><i data-lucide="trash" class="w-4 h-4"></i></button>` : ''}
                </div>`;
        });
        lucide.createIcons();
    });
}

window.addProduct = function() {
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const seller = document.getElementById('prod-seller').value;
    const desc = document.getElementById('prod-desc').value;
    const image = document.getElementById('prod-img').value;

    if(!name || !price || !seller) return alert("Fill all info");
    const status = userRole === 'admin' ? 'approved' : 'pending';

    db.collection('products').add({
        name, price, seller, description: desc, image, status,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(status === 'approved' ? "Published!" : "Sent for Review");
        loadDashboard();
        // clear inputs
        document.querySelectorAll('#view-dashboard input, #view-dashboard textarea').forEach(i => i.value = '');
    });
}

window.setStatus = (id, s) => db.collection('products').doc(id).update({status: s}).then(()=>loadDashboard());
window.delProd = (id) => confirm("Delete?") && db.collection('products').doc(id).delete().then(()=>loadDashboard());

window.checkRole = function() {
    const code = document.getElementById('role-code').value;
    if(code === ADMIN_CODE) userRole = 'admin';
    else if(code === SELLER_CODE) userRole = 'seller';
    else return alert("Invalid Code");
    
    localStorage.setItem('storeRole', userRole);
    switchTab('dashboard');
    document.getElementById('role-code').value = '';
}
window.logout = function() {
    userRole = 'buyer';
    localStorage.setItem('storeRole', 'buyer');
    switchTab('home');
}

// --- UTILS ---
window.changeCurrency = () => {
    activeCurrency = document.getElementById('currency-select').value;
    localStorage.setItem('currency', activeCurrency);
    loadProducts(); updateCartUI();
}

function formatPrice(usd) {
    const val = usd * rates[activeCurrency];
    return `${symbols[activeCurrency]}${activeCurrency === 'IDR' ? val.toLocaleString('id-ID') : val.toFixed(2)}`;
}

window.showToast = (msg) => {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
}
