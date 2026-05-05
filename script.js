// Function to toggle forms (attached to window for HTML onclick)
window.showSignup = function() {
    document.getElementById("signupForm").classList.remove("hidden");
    document.getElementById("loginForm").classList.add("hidden");
};

window.showLogin = function() {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("signupForm").classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    // SIGNUP
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("signupConfirmPassword").value;

        if (password !== confirmPassword) {
            return alert("Passwords do not match!");
        }

        try {
            const res = await fetch('http://localhost:3000/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirmPassword })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Account created! Please login.");
                window.showLogin();
            } else {
                alert(data.error || "Signup failed");
            }
        } catch (err) {
            alert("Server is not running.");
        }
    });

    // LOGIN
    loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {

            if (!data.user) {
                alert("Login failed: user data missing");
                return;
            }

            localStorage.setItem("token", data.token);

            localStorage.setItem("user", JSON.stringify({
                name: data.user.name || "No Name",
                email: data.user.email || "No Email",
                id: data.user.id || ""
            }));

            window.location.href = "dashboard.html";

        } else {
            alert(data.error || "Invalid credentials");
        }

    } catch (err) {
        console.error("REAL ERROR:", err);
        alert("Error: " + err.message);
    }
});
});