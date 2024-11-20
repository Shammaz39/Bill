import { db } from './firebase-config.js'; // Firebase config
import { collection, onSnapshot, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const itemForm = document.getElementById("item-form");
const itemContainer = document.getElementById("item-container");
const itemSelector = document.getElementById("item-selector");
const billContainer = document.getElementById("bill-container");
const addItemBtn = document.getElementById("add-item-btn");
let total = 0;

// Add Item to Firestore
itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemName = document.getElementById("item-name").value.trim();
    const itemPrice = parseFloat(document.getElementById("item-price").value);

    if (!itemName || isNaN(itemPrice)) {
        alert("Please enter valid item details!");
        return;
    }

    try {
        const itemRef = doc(db, "items", itemName);
        await setDoc(itemRef, { price: itemPrice });

        alert(`Item "${itemName}" added/updated successfully!`);
    } catch (error) {
        console.error("Error adding item: ", error);
        alert("Error adding item.");
    }

    itemForm.reset();
});

// Real-time Loading for Items List
function loadItems() {
    const itemsRef = collection(db, "items");

    onSnapshot(itemsRef, (snapshot) => {
        itemContainer.innerHTML = "";
        snapshot.forEach((doc) => {
            const itemName = doc.id;
            const item = doc.data();
            const li = document.createElement("li");

            li.innerHTML = `
                ${itemName} - ₹${item.price}
                <button class="modify-btn" data-id="${itemName}">Modify</button>
                <button class="delete-btn" data-id="${itemName}">Delete</button>
            `;
            itemContainer.appendChild(li);
        });

        attachDeleteEventListeners();
        attachModifyEventListeners();
    }, (error) => {
        console.error("Error loading items in real-time: ", error);
    });
}

// Attach event listeners to delete buttons
function attachDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemName = e.target.getAttribute('data-id');
            await deleteItem(itemName);
        });
    });
}

// Attach event listeners to modify buttons
function attachModifyEventListeners() {
    const modifyButtons = document.querySelectorAll('.modify-btn');
    modifyButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemName = e.target.getAttribute('data-id');
            const newPrice = parseFloat(prompt(`Enter new price for "${itemName}":`));

            if (isNaN(newPrice)) {
                alert("Invalid price. Please enter a number.");
                return;
            }

            try {
                const itemRef = doc(db, "items", itemName);
                await setDoc(itemRef, { price: newPrice }, { merge: true });
                alert(`Price for "${itemName}" updated to ₹${newPrice}.`);
            } catch (error) {
                console.error("Error updating price: ", error);
                alert("Error updating price.");
            }
        });
    });
}

// Delete Item from Firestore
async function deleteItem(itemName) {
    try {
        const itemRef = doc(db, "items", itemName);
        await deleteDoc(itemRef);
        alert(`Item "${itemName}" deleted successfully!`);
    } catch (error) {
        console.error("Error deleting item: ", error);
        alert("Error deleting item.");
    }
}

// Real-time Loading for Billing Dropdown
function loadBillingItems() {
    const itemsRef = collection(db, "items");

    onSnapshot(itemsRef, (snapshot) => {
        itemSelector.innerHTML = "";
        snapshot.forEach((doc) => {
            const itemName = doc.id;
            const item = doc.data();
            const option = document.createElement("option");
            option.value = JSON.stringify({ name: itemName, price: item.price });
            option.text = `${itemName} - ₹${item.price}`;
            itemSelector.add(option);
        });
    }, (error) => {
        console.error("Error loading billing items in real-time: ", error);
    });
}

// Add Item to Bill
function addItemToBill() {
    const selectedItem = JSON.parse(itemSelector.value);
    if (!selectedItem) {
        alert("Please select an item to add to the bill.");
        return;
    }
    total += selectedItem.price;
    billContainer.innerHTML += `<li>${selectedItem.name} - ₹${selectedItem.price}</li>`;
    document.getElementById("total-price").innerText = `₹${total}`;
}

// Print Bill
async function printBill() {
    const billData = {
        items: Array.from(billContainer.children).map((li) => li.innerText),
        total,
        date: new Date().toISOString(),
    };

    try {
        const formattedDate = new Date().toISOString().replace(/[^0-9]/g, "_");
        const billRef = doc(db, "bills", formattedDate);
        await setDoc(billRef, billData);

        alert("Bill saved!");

        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();
        pdfDoc.setFontSize(18);
        pdfDoc.text("Bill", 20, 20);

        pdfDoc.setFontSize(12);
        let yOffset = 30;
        billData.items.forEach((item) => {
            pdfDoc.text(item, 20, yOffset);
            yOffset += 10;
        });

        pdfDoc.text(`Total: ₹${billData.total}`, 20, yOffset);
        pdfDoc.text(`Date: ${new Date().toLocaleString()}`, 20, yOffset + 10);

        const safeDate = new Date().toISOString().replace(/[^0-9]/g, "_");
        pdfDoc.save(`bill_${safeDate}.pdf`);

        billContainer.innerHTML = "";
        total = 0;
        document.getElementById("total-price").innerText = "₹0";
    } catch (error) {
        console.error("Error saving bill: ", error);
        alert("Error saving bill.");
    }
}

// Load items on page load
document.addEventListener("DOMContentLoaded", () => {
    loadItems();
    loadBillingItems();

    addItemBtn.addEventListener("click", addItemToBill);

    const printBillBtn = document.getElementById("print-bill-btn");
    printBillBtn.addEventListener("click", printBill);
});

// Navigation
const viewItemsBtn = document.getElementById("view-items-btn");
const viewBillingBtn = document.getElementById("view-billing-btn");

const itemManagementSection = document.getElementById("item-management-section");
const billingSection = document.getElementById("billing-section");

viewItemsBtn.addEventListener("click", () => {
    itemManagementSection.style.display = "block";
    billingSection.style.display = "none";
});

viewBillingBtn.addEventListener("click", () => {
    itemManagementSection.style.display = "none";
    billingSection.style.display = "block";
});
