const API = "http://localhost:3000";

// Load all items
async function loadItems() {
  const res = await fetch(`${API}/all`);
  const items = await res.json();

  const list = document.getElementById("adminList");
  list.innerHTML = "";

  items.forEach(item => {
    list.innerHTML += `
      <li>
        <b>${item.title}</b> (${item.type}) - ${item.status}
        <br>
        <button onclick="updateStatus('${item._id}','approved')">Approve</button>
        <button onclick="updateStatus('${item._id}','returned')">Returned</button>
        <hr>
      </li>
    `;
  });
}

// Update status
async function updateStatus(id, status) {
  await fetch(`${API}/status/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ status })
  });

  loadItems();
}

// Run on page load
loadItems();