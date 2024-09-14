document.addEventListener('DOMContentLoaded', function() {
    fetchProducts();
});

async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:3000/products', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products. Please try again.');
        }

        const products = await response.json();
        const productContainer = document.querySelector('.product-container');
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.innerHTML = `
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>Price: $${product.price}</p>
                <button>Add to Cart</button>
            `;
            productContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        alert('Error loading products. Please try again later.');
    }
}
