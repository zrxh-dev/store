// --- CONFIGURATION ---
const ADMIN_CODE = "admin123";  
const SELLER_CODE = "seller123"; 
const WHATSAPP_NUMBER = "60123456789"; 

// --- CURRENCY SETTINGS ---
// 1 USD = 4.5 MYR = 16000 IDR (Approximate)
let activeCurrency = localStorage.getItem('currency') || 'USD';
const rates = { 'USD': 1, 'MYR': 4.5, 'IDR': 16000 };
const symbols = { 'USD': '$', 'MYR': 'RM', 'IDR': 'Rp ' };

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBcr6YxzsZ475J3c1rnQsuV7MWecxbRJ1E",
    authDomain: "aiapp-18eb8.firebaseapp.com",
    projectId: "aiapp-18eb8",
    storageBucket: "aiapp-18eb8.firebasestorage.app",
    messagingSenderId: "73094131400",
    appId: "1:73094131400:web:af6534a9768d429b05fffd",
    measurementId: "G-BQQE0BGQ8X"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- STATE ---
let userRole = localStorage.getItem('storeRole') || 'buyer';
let cart = JSON.parse(localStorage.getItem('cart')) || []; 

// --- INIT ---
document.getElementById('currency-select').value = activeCurrency;
lucide.createIcons();
loadProducts();
updateCartUI();

// --- NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'home') loadProducts();
}

// --- CURRENCY LOGIC ---
function changeCurrency() {
    activeCurrency = document.getElementById('currency-select').value;
    localStorage.setItem('currency', activeCurrency);
    loadProducts(); // Refresh prices
    updateCartUI(); // Refresh cart totals
}

function formatPrice(usdPrice) {
    const price = usdPrice * rates[activeCurrency];
    const display = activeCurrency === 'IDR' 
        ? price.toLocaleString('id-ID') 
        : price.toFixed(2);
    return `${symbols[activeCurrency]}${display}`;
}

// --- AUTH SYSTEM ---
function checkRole() {
    const input = document.getElementById('role-code').value;
    if(input === ADMIN_CODE) userRole = 'admin';
    else if (input === SELLER_CODE) userRole = 'seller';
    else return alert("Wrong code!");
    
    showToast(`Welcome ${userRole}!`);
    localStorage.setItem('storeRole', userRole);
    document.getElementById('role-code').value = '';
    switchTab('dashboard');
}

function logout() {
    userRole = 'buyer';
    localStorage.setItem('storeRole', 'buyer');
    switchTab('home');
    showToast("Logged out");
}

// --- PRODUCT LOGIC (CATALOGUE) ---
function loadProducts() {
    const grid = document.getElementById('product-grid');
    
    db.collection('products').where('status', '==', 'approved').get().then(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            const dataStr = encodeURIComponent(JSON.stringify({id: doc.id, ...p}));
            
            // UPDATE: Only showing Image, Name, and Price. 
            // The Image is inside a square container (img-container)
            grid.innerHTML += `
                <div class="product-card" onclick="openProductDetail('${dataStr}')">
                    <div class="img-container">
                        <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <div class="product-info">
                        <div class="product-title">${p.name}</div>
                        <div class="product-price-tag">${formatPrice(p.price)}</div>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

// --- MODAL LOGIC (FULL INFO) ---
function openProductDetail(dataStr) {
    const p = JSON.parse(decodeURIComponent(dataStr));
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');
    
    // Fill Info
    document.getElementById('modal-img').src = p.image;
    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-seller').textContent = `Uploaded by: ${p.seller}`;
    document.getElementById('modal-price').textContent = formatPrice(p.price);
    document.getElementById('modal-desc').textContent = p.description || "No description provided.";
    
    // Setup Add Button
    const btn = document.getElementById('modal-add-btn');
    btn.onclick = () => {
        addToCart(p.id, p.name, p.price, p.image);
        closeModal();
    };

    // Show
    modal.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('translate-y-full');
}

function closeModal() {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');
    modal.classList.add('opacity-0', 'pointer-events-none');
    content.classList.add('translate-y-full');
}

// --- ADD PRODUCT ---
function addProduct() {
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const seller = document.getElementById('prod-seller').value;
    const description = document.getElementById('prod-desc').value;
    const image = document.getElementById('prod-img').value;

    if(!name || !price || !seller) return alert("Fill all fields");

    const status = userRole === 'admin' ? 'approved' : 'pending';

    db.collection('products').add({
        name, price, seller, description, image, status,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(status === 'approved' ? "Product Live!" : "Sent for Approval!");
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-desc').value = '';
        document.getElementById('prod-price').value = '';
        loadDashboard();
    });
}

// --- DASHBOARD ---
function loadDashboard() {
    document.getElementById('dashboard-role').textContent = userRole.toUpperCase();
    if(userRole === 'buyer') { switchTab('login'); return; }

    const pendingDiv = document.getElementById('admin-approvals');
    const pList = document.getElementById('pending-list');
    const list = document.getElementById('manage-list');

    if(userRole === 'admin') {
        pendingDiv.classList.remove('hidden');
        db.collection('products').where('status', '==', 'pending').get().then(snap => {
            pList.innerHTML = snap.empty ? '<div class="text-xs text-gray-400">No pending items.</div>' : '';
            snap.forEach(doc => {
                const p = doc.data();
                pList.innerHTML += `
                    <div class="admin-item">
                        <div>
                            <div class="font-bold text-sm">${p.name}</div>
                            <div class="text-xs text-gray-500">${formatPrice(p.price)}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="updateStatus('${doc.id}', 'approved')" class="text-green-600"><i data-lucide="check"></i></button>
                            <button onclick="deleteProduct('${doc.id}')" class="text-red-600"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>`;
            });
            lucide.createIcons();
        });
    } else { pendingDiv.classList.add('hidden'); }

    db.collection('products').where('status', '==', 'approved').get().then(snap => {
        list.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            list.innerHTML += `
                <div class="admin-item">
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" class="w-10 h-10 rounded object-cover">
                        <div>
                            <div class="font-bold text-sm">${p.name}</div>
                            <div class="text-xs text-gray-500">${formatPrice(p.price)}</div>
                        </div>
                    </div>
                    ${userRole === 'admin' ? `<button onclick="deleteProduct('${doc.id}')" class="text-red-400"><i data-lucide="trash"></i></button>` : ''}
                </div>`;
        });
        lucide.createIcons();
    });
}

function updateStatus(id, status) { db.collection('products').doc(id).update({ status }).then(() => loadDashboard()); }
function deleteProduct(id) { if(confirm("Delete?")) db.collection('products').doc(id).delete().then(() => loadDashboard()); }

// --- CART LOGIC ---
function addToCart(id, name, price, image) {
    const existing = cart.find(item => item.id === id);
    if(existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price, image, qty: 1 });
    }
    saveCart();
    showToast("Added to Cart!");
}

function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if(!item) return;
    item.qty += change;
    if(item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cart-count').textContent = count;
    document.getElementById('cart-count').classList.toggle('hidden', count === 0);
    
    const container = document.getElementById('cart-items');
    let totalUSD = 0;
    
    container.innerHTML = '';
    
    if(cart.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 mt-10">Cart is empty.</div>';
    } else {
        cart.forEach(item => {
            totalUSD += (item.price * item.qty);
            container.innerHTML += `
                <div class="bg-white p-3 rounded-xl flex items-center gap-3 shadow-sm border border-gray-100">
                    <img src="${item.image}" class="w-16 h-16 rounded-lg object-cover bg-gray-100">
                    <div class="flex-1">
                        <div class="font-bold text-gray-800 text-sm leading-tight">${item.name}</div>
                        <div class="text-blue-600 font-bold text-sm mt-1">${formatPrice(item.price)}</div>
                    </div>
                    <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                        <button onclick="updateQty('${item.id}', -1)" class="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-red-500 font-bold transition-colors">
                            ${item.qty === 1 ? '<i data-lucide="trash-2" class="w-3 h-3"></i>' : '-'}
                        </button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="updateQty('${item.id}', 1)" class="w-7 h-7 flex items-center justify-center bg-gray-800 rounded-md shadow-sm text-white hover:bg-black font-bold transition-colors">+</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cart-total').textContent = formatPrice(totalUSD);
    lucide.createIcons();
}

function checkoutWhatsApp() {
    if(cart.length === 0) return alert("Cart is empty!");
    let msg = "Hi! I would like to buy:%0A";
    let totalUSD = 0;
    cart.forEach(item => {
        let subtotal = item.price * item.qty;
        totalUSD += subtotal;
        msg += `- ${item.name} (x${item.qty}) - ${formatPrice(item.price)} each%0A`;
    });
    msg += `%0A*Total: ${formatPrice(totalUSD)}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// --- UTILS ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => { t.classList.add('hidden'); }, 2000);
}
