// ===============================
// 📌 MODAL & NAVIGATION
// ===============================
const searchInput = document.getElementById('searchInput');
const locationFilter = document.getElementById('locationFilter');

// Filtering logic for the UI
function filterUI() {
    const query = searchInput.value.toLowerCase();
    const loc = locationFilter.value;
    const items = document.querySelectorAll('.item');

    items.forEach(item => {
        const name = item.querySelector('h3').innerText.toLowerCase();
        const itemLoc = item.querySelector('.location-text').innerText;
        
        const matchesQuery = name.includes(query);
        const matchesLoc = (loc === 'all' || itemLoc === loc);
        
        item.style.display = (matchesQuery && matchesLoc) ? "block" : "none";
    });
}

if (searchInput) searchInput.addEventListener('input', filterUI);
if (locationFilter) locationFilter.addEventListener('change', filterUI);

// Triggered after reporting a lost item to find potential matches in the DB
async function checkMatches(lostItemId) {
    try {
        const response = await fetch(`http://localhost:5000/api/match/${lostItemId}`);
        const matches = await response.json();

        if (matches.length > 0) {
            const alertBox = document.getElementById('matchAlert');
            if (alertBox) {
                document.getElementById('matchMessage').innerText = 
                    `We found ${matches.length} items that match your description!`;
                alertBox.style.display = "block";
            }
        }
    } catch (err) {
        console.error("Match error:", err);
    }
}

function openModal(content) {
    document.getElementById("modal").style.display = "flex";
    document.getElementById("formContent").innerHTML = content;
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) closeModal();
};

// ===============================
// 📌 FILE PREVIEW & VALIDATION
// ===============================
function previewImage(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById("imagePreview");
    const maxSize = 2 * 1024 * 1024; // 2MB

    previewContainer.innerHTML = "";

    if (file) {
        if (file.size > maxSize) {
            alert("File is too large! Please select an image smaller than 2MB.");
            event.target.value = ""; 
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "200px";
            img.style.borderRadius = "8px";
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// ===============================
// 📌 FORMS (LOST / FOUND / CLAIM)
// ===============================
function openLostForm() {
    openModal(`
        <div class="form-container">
            <h2>Report Lost Item</h2>
            <input type="text" id="lostName" placeholder="Item Name" required>
            <select id="lostCategory" required>
                <option value="" disabled selected>Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Documents">Documents</option>
                <option value="Personal Belongings">Personal Belongings</option>
                <option value="Accessories">Accessories</option>
                <option value="Others">Others</option>
            </select>
            <input type="text" id="lostLocation" placeholder="Last Seen Location" required>
            <div class="input-group">
                <label for="lostDate">Date Lost:</label>
                <input type="date" id="lostDate" max="${new Date().toISOString().split("T")[0]}">
            </div>
            <div class="file-input-wrapper">
                <label for="lostImage">Upload Image (Max 2MB):</label>
                <input type="file" id="lostImage" accept="image/*" onchange="previewImage(event)">
            </div>
            <div id="imagePreview" style="margin-top: 10px; text-align: center;"></div>
            <textarea id="lostDesc" placeholder="Description/Special Marks"></textarea>
            <label>Item Status:</label>
            <select id="itemStatus">
                <option value="Open" selected>Open(Pending Claim)</option>
                <option value="Matched">Matched</option>
            </select>
            <div class="form-actions">
                <button class="submit-btn" onclick="submitLost()">Submit Report</button>
                <button class="close-btn-alt" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `);
}

function openFoundForm() {
    openModal(`
        <div class="form-container">
            <h2>Report Found Item</h2>

            <input type="text" id="foundName" placeholder="Item Name" required>

            <select id="foundCategory" required>
                <option value="" disabled selected>Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Documents">Documents</option>
                <option value="Personal Belongings">Personal Belongings</option>
                <option value="Accessories">Accessories</option>
                <option value="Others">Others</option>
            </select>

            <input type="text" id="foundLocation" placeholder="Where did you find it?" required>

            <div>
                <label>Date Found:</label>
                <input type="date" id="foundDate" required 
                max="${new Date().toISOString().split("T")[0]}">
            </div>

            <input type="file" id="foundImage" accept="image/*">

            <textarea id="foundDesc" placeholder="Describe the item..."></textarea>

            <button onclick="submitFound()">Post</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `);
}


async function submitFound() {
    const name = document.getElementById("foundName").value.trim();
    const category = document.getElementById("foundCategory").value;
    const location = document.getElementById("foundLocation").value.trim();
    const date = document.getElementById("foundDate").value;
    const desc = document.getElementById("foundDesc").value.trim();
    const file = document.getElementById("foundImage").files[0];
    const token = localStorage.getItem("token");

    // ✅ Validation
    if (!name || !category || !location || !date) {
        alert("Please fill all required fields");
        return;
    }

    if (!token) {
        alert("Please login first");
        return;
    }

    const formData = new FormData();
    formData.append("itemName", name);
    formData.append("category", category);
    formData.append("location", location);
    formData.append("dateFound", date);
    formData.append("description", desc);

    if (file) formData.append("image", file);

    try {
        const res = await fetch("http://localhost:3000/api/found", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            alert("Item posted successfully");
            closeModal();
             window.location.href = "found.html";
        } else {
            alert(data.error || "Error occurred");
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

function openClaimForm(itemId, itemType) {
    openModal(`
        <div id="claimModal" class="modal">
            <div class="modal-content">
                <h2>Claim Item</h2>

                <input type="hidden" id="itemId" value="${itemId || ''}">
                <input type="hidden" id="itemType" value="${itemType || ''}">
                
                <input type="text" id="claimerName" placeholder="Your Name" required />
                <input type="email" id="collegeEmail" placeholder="College Email" required />
                <textarea id="proofDescription" placeholder="Describe Proof of Ownership" required></textarea>

                <button onclick="submitClaim()">Submit Claim</button>
                <button onclick="closeModal()">Close</button>
            </div>
        </div>
    `);

    // 🔍 DEBUG
    console.log("OPEN FORM:", itemId, itemType);
}

// ===============================
// 📌 SUBMISSION LOGIC (BACKEND INTEGRATED)
// ===============================

async function submitLost() {
    // 1. Get the token (Assumes you saved it to localStorage during login)
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to report an item.");
        return;
    }

    // 2. Get DOM elements
    const name = document.getElementById("lostName").value;
    const category = document.getElementById("lostCategory").value;
    const location = document.getElementById("lostLocation").value;
    const date = document.getElementById("lostDate").value;
    const desc = document.getElementById("lostDesc").value;
    const fileInput = document.getElementById("lostImage");

    // 3. Basic Validation
    if (!name || !category || !location) {
        alert("Please fill all required fields");
        return;
    }

    // 4. Use FormData because your backend uses Multer for images
    const formData = new FormData();
    formData.append('itemName', name); // Matches 'itemName' in your backend search logic
    formData.append('category', category);
    formData.append('location', location);
    formData.append('dateLost', date); 
    formData.append('description', desc);
    
    // Append the actual file if it exists
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        // 5. Fetch to Port 3000 and the correct /api/lost endpoint
        const response = await fetch('http://localhost:3000/api/lost', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` 
                // Note: Do NOT set 'Content-Type' manually when using FormData
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert("Lost item reported successfully!");
            closeModal(); // better UX
            loadLostItems();
        } else {
            alert("Error: " + (result.error || result.message));
        }
    } catch (err) {
        console.error("Connection error:", err);
        alert("Failed to connect to server. Ensure your backend is running on port 3000.");
    }
}

async function submitClaim() {
    const itemId = document.getElementById("itemId").value;
    const itemType = document.getElementById("itemType").value;

    // 👇 ADD DEBUG HERE
    console.log("itemId:", itemId);
    console.log("itemType:", itemType);

    const data = {
        itemId,
        itemType,
        claimerName: document.getElementById("claimerName").value,
        collegeEmail: document.getElementById("collegeEmail").value,
        proofDescription: document.getElementById("proofDescription").value
    };

    // 👇 OPTIONAL: full payload check
    console.log("Sending data:", data);

    try {
        const res = await fetch("http://localhost:3000/api/claims", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        alert(result.message);

    } catch (err) {
        console.error(err);
        alert("Error submitting claim");
    }
}

// Utility to sync dropdown with existing UI items
function updateLocationDropdown() {
    const locationFilter = document.getElementById('locationFilter');
    const items = document.querySelectorAll('.location-text');
    if (!locationFilter) return;

    const locations = new Set(); 
    items.forEach(item => locations.add(item.innerText.trim()));

    locationFilter.innerHTML = '<option value="all">All Locations</option>';
    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locationFilter.appendChild(option);
    });
}