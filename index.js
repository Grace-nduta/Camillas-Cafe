document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuContainer = document.getElementById('menu-items');
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('filter-category');
    const addItemForm = document.getElementById('add-item-form');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const orderItemsContainer=document.getElementById("order-items");
    const totalCostElement=document.getElementById("total-cost");
    const placeOrderBtn=document.getElementById("place-order-btn");
    const reviewForm =document.getElementById('review-form');
    const reviewsList =document.getElementById('reviews-list');

    //order track
    let CurrentOrder =[];

    //initialize the dark mode from local Storage
    if (localStorage.getItem('darkMode')==="dark"){
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent="☀ Light Mode";
    }

    // Fetch Menu Items
    fetchMenuItems();
    fetchReviews();

    //Add Event Listeners 
    searchInput.addEventListener('input', handleSearch);
    filterSelect.addEventListener('change', handleFilter);
    addItemForm.addEventListener('submit', handleAddItem);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    placeOrderBtn.addEventListener('click', completeOrder);
    reviewForm.addEventListener('submit',handleReviewSubmit);

    // Fetch menu items from db.json
    function fetchMenuItems() {
        fetch('http://localhost:3000/menu')
            .then(response => response.json())
            .then(renderMenuItems)
            .catch(error => console.error('Error fetching menu:', error));
    }
    
    // Use forEach method to Render the menu items
    function renderMenuItems(items) {
        menuContainer.innerHTML = '';
        
        items.forEach(item => {
            const isAvailable = item.available > 0;
            const stockStatus = isAvailable ? `Available: ${item.available}` : 'SOLD OUT';

            const itemElement = document.createElement('div');
            itemElement.className = `menu-item ${item.available ? '' : 'sold-out'}`;
            itemElement.innerHTML = `
            <div class="item-image-container">
            <img src="${item.image}"alt"${item.name}"class="item-image" onerror="this.src=,https://via.placeholde.com/300*200?text=No+Image'">
            </div>
                <h3>${item.name}</h3>
                <p class="price">Ksh ${item.price}</p>
                <p class="description">${item.description}</p>
                <p class="stock">${stockStatus}</p>
                <p class="ingredients"><strong>Ingredients:</strong> ${item.ingredients.join(',')}</p>
                <button class="order-btn" ${item.available ? '' : 'disabled'}>
                    ${isAvailable ? 'Add to Order' : 'Sold Out'}
                </button>
            `;
            
            if (isAvailable) {
                itemElement.querySelector('.order-btn').addEventListener('click', () => {
                    addToOrder(item);
                });
            }
            
            menuContainer.appendChild(itemElement);
        });
    }

    //Handle order ....decrease in stock
    function addToOrder(item) {
        const existingItem = CurrentOrder.find(orderItem => orderItem.id === item.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            CurrentOrder.push({
                ...item,
                quantity: 1
            });
        }
        updateOrderDisplay();
    }

    //Update Order Display
    function updateOrderDisplay() {
        orderItemsContainer.innerHTML = '';
        let total = 0;

        CurrentOrder.forEach(item => {
            const orderItemElement = document.createElement('div');
            orderItemElement.className = 'order-item';
            orderItemElement.innerHTML = `
                <span class="order-item-name">${item.name} × ${item.quantity}</span>
                <span class="order-item-price">Ksh ${item.price * item.quantity}</span>
                <button class="remove-item-btn" data-id="${item.id}">−</button>
            `;
            orderItemsContainer.appendChild(orderItemElement);

            total += item.price * item.quantity;

            orderItemElement.querySelector('.remove-item-btn').addEventListener('click', () => {
                removeFromOrder(item.id);
            });
        });

        totalCostElement.textContent = `Ksh ${total}`;
        placeOrderBtn.disabled = CurrentOrder.length === 0;
    }

    // Remove item from order
    function removeFromOrder(itemId) {
        const itemIndex = CurrentOrder.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            if (CurrentOrder[itemIndex].quantity > 1) {
                CurrentOrder[itemIndex].quantity -= 1;
            } else {
                CurrentOrder.splice(itemIndex, 1);
            }
            updateOrderDisplay();
        }
    }

    // Complete order
    function completeOrder() {
        if (CurrentOrder.length === 0){
        alert('Attempted to place empty order');
            return;
        } 

        const promises = CurrentOrder.map(item => {
            const newStock = parseInt(item.available) - item.quantity;
            return fetch(`http://localhost:3000/menu/${item.id}`, {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available: newStock })
            });
        });

        Promise.all(promises)
            .then(() => {
                alert(`Order placed successfully! Total: ${totalCostElement.textContent}`);
                CurrentOrder = [];
                updateOrderDisplay();
                fetchMenuItems();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error processing order');
            });
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        fetch('http://localhost:3000/menu')
            .then(response => response.json())
            .then(items => {
                const filtered = items.filter(item => 
                    item.name.toLowerCase().includes(searchTerm) || 
                    item.description.toLowerCase().includes(searchTerm)
                );
                renderMenuItems(filtered);
            });
    }

    // Filter by category
    function handleFilter() {
        const category = filterSelect.value;
        fetch('http://localhost:3000/menu')
            .then(response => response.json())
            .then(items => {
                const filtered = category === 'all' 
                    ? items 
                    : items.filter(item => item.category === category);
                renderMenuItems(filtered);
            });
    }
            

    // Add new item to menu
    function handleAddItem(e) {
        e.preventDefault();//prevent refreshing
        
        const newItem = {
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            price: parseFloat(document.getElementById('item-price').value),//To give a whole number
            description: document.getElementById('item-description').value,
            ingredients: document.getElementById('item-ingredients').value.split(',').map(i=>i.trim()),
            available: document.getElementById('item-available').checked ? 50 : 0,
        };

        fetch('http://localhost:3000/menu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newItem)
        })
        .then(() => {
            alert('Item added successfully!');
            addItemForm.reset();
            fetchMenuItems();
        })
        .catch(error => console.error('Error adding item:', error));
    }
      // Review system functions
      function fetchReviews() {
        fetch('http://localhost:3000/reviews')
            .then(response => response.json())
            .then(renderReviews)
            .catch(error => console.error('Error fetching reviews:', error));
    }

    function renderReviews(reviews) {
        reviewsList.innerHTML = '';
        
        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-card';
            reviewElement.innerHTML = `
                <div class="review-header">
                    <h4>${review.customerName}</h4>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <p class="review-date">${new Date(review.date).toLocaleDateString()}</p>
                <p class="review-comment">${review.comment}</p>
            `;
            reviewsList.appendChild(reviewElement);
        });
    }

    function handleReviewSubmit(e) {
        e.preventDefault();
        
        const newReview = {
            customerName: document.getElementById('review-name').value,
            rating: parseInt(document.getElementById('review-rating').value),
            comment: document.getElementById('review-comment').value,
            date: new Date().toISOString()
        };

        fetch('http://localhost:3000/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newReview)
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to submit review');
            return response.json();
        })
        .then(() => {
            alert('Thank you for your review!');
            reviewForm.reset();
            fetchReviews();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to submit review. Please try again.');
        });
    } 
    // Toggle dark mode 
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');

        const isDarkMode =document.body.classList.contains("dark-mode");
        localStorage.setItem('darkMode', isDarkMode ? 'dark' : 'light');
        darkModeToggle.textContent = document.body.classList.contains('dark-mode') 
            ? '☀ Light Mode' 
            : '🌙 Dark Mode';
    }
});