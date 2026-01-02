/**
 * Job Application Form - Main JavaScript
 * Handles form submission, animations, and interactive effects
 */

// DOM Elements
const form = document.querySelector("#job_opening");
const submitBtn = document.querySelector("#submit_btn");
const spinner = document.querySelector("#job_spin");
const smile = document.querySelector("#job_smile");

/**
 * Form Submission Handler
 * Sends form data to the webhook endpoint
 */
async function sendData() {
    // Create FormData from form
    const formData = new FormData(form);

    try {
        // Hide success icon and show spinner
        smile.classList.remove("active");
        smile.classList.add("hidden");
        spinner.classList.remove("hidden");
        spinner.classList.add("active");
        submitBtn.disabled = true;

        // Send POST request
        const response = await fetch("https://mollusk-pleased-lemming.ngrok-free.app/webhook/jappmotlet", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        console.log("Response:", result);

        // Hide spinner first
        spinner.classList.remove("active");
        spinner.classList.add("hidden");

        // Evaluate the response - check if "ok" is true
        if (result.ok === true) {
            // Show success icon
            smile.classList.remove("hidden");
            smile.classList.add("active");

            // Reset form after 2 seconds
            setTimeout(() => {
                form.reset();
                smile.classList.remove("active");
                smile.classList.add("hidden");
                submitBtn.disabled = false;
            }, 60000);
        } else {
            // Handle unsuccessful response
            submitBtn.disabled = false;

            // Show error message with details if available
            const errorMessage = result.message || result.error || "The submission was not successful. Please try again.";
            alert(`Error: ${errorMessage}`);
        }

    } catch (error) {
        console.error("Submission error:", error);

        // Hide spinner on error
        spinner.classList.remove("active");
        spinner.classList.add("hidden");
        submitBtn.disabled = false;

        // Show error feedback (you can customize this)
        alert("There was an error submitting your application. Please try again.");
    }
}

/**
 * Form Submit Event Listener
 * Prevents default form submission and handles with custom function
 */
form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Basic HTML5 validation check
    if (form.checkValidity()) {
        sendData();
    } else {
        // Trigger browser's built-in validation UI
        form.reportValidity();
    }
});

/**
 * Input Interaction Effects
 * Adds smooth animations on focus/blur
 */
const inputs = document.querySelectorAll('.form-input, .form-textarea');
inputs.forEach(input => {
    // Add focus animation
    input.addEventListener('focus', function () {
        this.parentElement.style.transform = 'translateY(-2px)';
    });

    input.addEventListener('blur', function () {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

/**
 * Parallax Effect
 * Subtle 3D tilt effect on mouse movement
 */
document.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;

    const glassCard = document.querySelector('.glass-card');
    if (glassCard) {
        glassCard.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg)`;
    }
});

/**
 * Reset Card Position
 * Resets the parallax effect when mouse leaves the window
 */
document.addEventListener('mouseleave', () => {
    const glassCard = document.querySelector('.glass-card');
    if (glassCard) {
        glassCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    }
});
