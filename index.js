// --- CONFIGURATION ---
const ADMIN_CODE = "admin123";  // Code to become Admin
const SELLER_CODE = "seller123"; // Code to become Seller
const WHATSAPP_NUMBER = "60123456789"; // CHANGE THIS TO YOUR NUMBER

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
let userRole = localStorage.getItem('storeRole') || 'buyer'; // 'admin', 'seller', 'buyer'
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = [];

// --- INIT ---
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

// --- AUTH SYSTEM (SIMPLE CODES) ---
function checkRole() {
    const input = document.getElementById('role-code').value;
    if(input === ADMIN_CODE) {
        userRole = 'admin';
        showToast("Welcome Boss!");
    } else if (input === SELLER_CODE) {
        userRole = 'seller';
        showToast("Welcome Seller!");
    } else {
        alert("Wrong code!");
        return;
    }
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

// --- PRODUCT LOGIC ---
function loadProducts() {
    const grid = document.getElementById('product-grid');
    // Only buyers/public see approved. Admin sees all in dashboard.
    db.collection('products').where('status', '==', 'approved').get().then(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            grid.innerHTML += `
                <div class="product-card">
                    <img src="${p.image}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="product-info">
                        <div class="product-title">${p.name}</div>
                        <div class="product-seller">By ${p.seller}</div>
                        <div class="product-price">$${p.price}</div>
                        <button onclick="addToCart('${doc.id}', '${p.name}', ${p.price})" class="add-btn">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

function addProduct() {
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const seller = document.getElementById('prod-seller').value;
    const image = document.getElementById('prod-img').value;

    if(!name || !price || !seller) return alert("Fill all fields");

    // Admin items auto-approved. Sellers are pending.
    const status = userRole === 'admin' ? 'approved' : 'pending';

    db.collection('products').add({
        name, price, seller, image, status,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(status === 'approved' ? "Product Live!" : "Sent for Approval!");
        document.getElementById('prod-name').value = '';
        loadDashboard();
    });
}

// --- DASHBOARD LOGIC ---
function loadDashboard() {
    document.getElementById('dashboard-role').textContent = userRole.toUpperCase();
    
    if(userRole === 'buyer') {
        alert("You are not staff!");
        switchTab('login');
        return;
    }

    // 1. Load Pending (Admin Only)
    const pendingDiv = document.getElementById('admin-approvals');
    if(userRole === 'admin') {
        pendingDiv.classList.remove('hidden');
        const pList = document.getElementById('pending-list');
        db.collection('products').where('status', '==', 'pending').get().then(snap => {
            pList.innerHTML = snap.empty ? '<div class="text-xs text-gray-400">No pending items.</div>' : '';
            snap.forEach(doc => {
                const p = doc.data();
                pList.innerHTML += `
                    <div class="admin-item">
                        <div>
                            <div class="font-bold text-sm">${p.name}</div>
                            <div class="text-xs text-gray-500">By ${p.seller} • $${p.price}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="updateStatus('${doc.id}', 'approved')" class="text-green-600"><i data-lucide="check"></i></button>
                            <button onclick="deleteProduct('${doc.id}')" class="text-red-600"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                `;
            });
            lucide.createIcons();
        });
    } else {
        pendingDiv.classList.add('hidden');
    }

    // 2. Load All/My Products
    const list = document.getElementById('manage-list');
    let q = db.collection('products');
    // Sellers only see their own? Or all? Let's show all approved for now.
    q = q.where('status', '==', 'approved');
    
    q.get().then(snap => {
        list.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            list.innerHTML += `
                <div class="admin-item">
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" class="w-8 h-8 rounded object-cover bg-gray-200">
                        <div>
                            <div class="font-bold text-sm">${p.name}</div>
                            <div class="text-xs text-gray-500">$${p.price}</div>
                        </div>
                    </div>
                    ${userRole === 'admin' ? `<button onclick="deleteProduct('${doc.id}')" class="text-red-400"><i data-lucide="trash"></i></button>` : ''}
                </div>
            `;
        });
        lucide.createIcons();
    });
}

function updateStatus(id, status) {
    db.collection('products').doc(id).update({ status }).then(() => loadDashboard());
}

function deleteProduct(id) {
    if(confirm("Delete this item?")) {
        db.collection('products').doc(id).delete().then(() => loadDashboard());
    }
}

// --- CART LOGIC ---
function addToCart(id, name, price) {
    cart.push({ id, name, price });
    saveCart();
    showToast("Added to Cart!");
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').textContent = cart.length;
    document.getElementById('cart-count').classList.toggle('hidden', cart.length === 0);
    
    const container = document.getElementById('cart-items');
    let total = 0;
    
    if(cart.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 mt-10">Cart is empty.</div>';
    } else {
        container.innerHTML = '';
        cart.forEach((item, index) => {
            total += item.price;
            container.innerHTML += `
                <div class="cart-item">
                    <div class="flex-1">
                        <div class="font-bold text-sm">${item.name}</div>
                        <div class="text-xs text-gray-500">$${item.price}</div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-red-400"><i data-lucide="x"></i></button>
                </div>
            `;
        });
    }
    
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
    lucide.createIcons();
}

function checkoutWhatsApp() {
    if(cart.length === 0) return alert("Cart is empty!");
    
    let msg = "Hi! I would like to buy:%0A";
    let total = 0;
    
    cart.forEach(item => {
        msg += `- ${item.name} ($${item.price})%0A`;
        total += item.price;
    });
    
    msg += `%0A*Total: $${total.toFixed(2)}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
}

// --- UTILS ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.style.top = '20px';
    setTimeout(() => { t.classList.add('hidden'); }, 2000);
}

// EXPORTS
window.switchTab = switchTab;
window.checkRole = checkRole;
window.logout = logout;
window.addProduct = addProduct;
window.updateStatus = updateStatus;
window.deleteProduct = deleteProduct;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.checkoutWhatsApp = checkoutWhatsApp;
