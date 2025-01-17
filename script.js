// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Update remaining time for auctions
    function updateTimeRemaining() {
        const items = document.querySelectorAll('.item-card');
        items.forEach(item => {
            const endTime = new Date(item.dataset.endTime).getTime();
            const now = new Date().getTime();
            const timeLeft = endTime - now;

            if (timeLeft <= 0) {
                item.querySelector('.time-remaining').textContent = 'Auction Ended';
                item.querySelector('.bid-form').style.display = 'none';
            } else {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                item.querySelector('.time-remaining').textContent = 
                    `Time remaining: ${hours}h ${minutes}m`;
            }
        });
    }

    // Handle bid form submission
    document.querySelectorAll('.bid-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            try {
                const response = await fetch('/place-bid', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        alert('Bid placed successfully!');
                        location.reload();
                    } else {
                        alert(data.message || 'Failed to place bid');
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while placing the bid');
            }
        });
    });

    // Update time remaining every minute
    setInterval(updateTimeRemaining, 60000);
    updateTimeRemaining();
});
