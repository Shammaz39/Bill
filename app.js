import { db } from './firebase-config.js'; // Firebase config
import { collection, onSnapshot, setDoc, deleteDoc, doc, addDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

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
        // Use item name as the document ID
        const itemRef = doc(db, "items", itemName); 
        await setDoc(itemRef, { 
            price: itemPrice // Only price is stored, as the name is in the document ID
        });

        alert(`Item "${itemName}" added/updated successfully!`);
    } catch (error) {
        console.error("Error adding item: ", error);
        alert("Error adding item.");
    }

    // Clear form
    itemForm.reset();
});

// Real-time Loading for Items List
function loadItems() {
    const itemsRef = collection(db, "items");

    // Listen for real-time updates
    onSnapshot(itemsRef, (snapshot) => {
        itemContainer.innerHTML = ""; // Clear the container before loading items
        snapshot.forEach((doc) => {
            const itemName = doc.id; // Use document ID as the item name
            const item = doc.data(); // Contains only the price
            const li = document.createElement("li");
            li.innerHTML = `${itemName} - ₹${item.price} 
                            <button class="delete-btn" data-id="${itemName}">Delete</button>`;
            itemContainer.appendChild(li);
        });

        // Attach event listeners to the delete buttons
        attachDeleteEventListeners();
    }, (error) => {
        console.error("Error loading items in real-time: ", error);
    });
}

// Attach event listeners to delete buttons
function attachDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const itemName = e.target.getAttribute('data-id');
            deleteItem(itemName);
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
        alert("Error deleting item: " + error.message);
    }
}

// Real-time Loading for Billing Dropdown
function loadBillingItems() {
    const itemsRef = collection(db, "items");

    // Listen for real-time updates
    onSnapshot(itemsRef, (snapshot) => {
        itemSelector.innerHTML = ""; // Clear the dropdown before loading items
        snapshot.forEach((doc) => {
            const itemName = doc.id; // Use document ID as the item name
            const item = doc.data();
            const option = document.createElement("option");
            option.value = JSON.stringify({ name: itemName, price: item.price });
            option.text = `${itemName} - ₹${item.price}`;
            itemSelector.add(option); // Add option to dropdown
        });
    }, (error) => {
        console.error("Error loading billing items in real-time: ", error);
    });
}

// Add Item to Bill
function addItemToBill() {
    const selectedItem = JSON.parse(itemSelector.value); // Parse the selected item as JSON
    if (!selectedItem) {
        alert("Please select an item to add to the bill.");
        return;
    }
    total += selectedItem.price; // Add selected item's price to the total
    billContainer.innerHTML += `<li>${selectedItem.name} - ₹${selectedItem.price}</li>`;
    document.getElementById("total-price").innerText = total; // Update the total price
}

// Print (Generate and Save) the Bill
async function printBill() {
    const billData = {
        items: Array.from(billContainer.children).map((li) => li.innerText), // Extract items as strings
        total,
        date: new Date().toISOString(),
    };

    try {
        // Save the bill data to Firestore
        await addDoc(collection(db, "bills"), billData); // Save the bill in Firestore with auto-generated ID
        alert("Bill saved!");

        // Create the PDF using jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title and bill details
        doc.setFontSize(18);
        doc.text("Bill", 20, 20);

        // Add each item in the bill to the PDF
        doc.setFontSize(12);
        let yOffset = 30; // Start y position for the items
        billData.items.forEach((item) => {
            doc.text(item, 20, yOffset);
            yOffset += 10; // Increase y position for the next item
        });

        // Add the total to the PDF
        doc.text(`Total: ₹${billData.total}`, 20, yOffset);

        // Save the PDF
        doc.save(`bill_${billData.date}.pdf`);

        // Clear the bill container after printing the bill
        billContainer.innerHTML = "";  // Remove the bill list from the page
        total = 0;  // Reset the total

        // Reset the total display
        document.getElementById("total-price").innerText = total;

    } catch (error) {
        alert("Error saving bill.");
    }
}

// Load items when the page loads
document.addEventListener("DOMContentLoaded", () => {
    loadItems(); // Real-time updates for item list
    loadBillingItems(); // Real-time updates for billing dropdown

    // Add event listener to the "Add Item" button
    addItemBtn.addEventListener("click", addItemToBill);

    // Add event listener to the "Print Bill" button
    const printBillBtn = document.getElementById("print-bill-btn");
    printBillBtn.addEventListener("click", printBill);
});

// DOM Elements
const viewItemsBtn = document.getElementById("view-items-btn");
const viewBillingBtn = document.getElementById("view-billing-btn");

const itemManagementSection = document.getElementById("item-management-section");
const billingSection = document.getElementById("billing-section");

// Event Listeners for Navigation
viewItemsBtn?.addEventListener("click", () => {
    itemManagementSection.style.display = "block"; // Show item management section
    billingSection.style.display = "none"; // Hide billing section
});

viewBillingBtn?.addEventListener("click", () => {
    itemManagementSection.style.display = "none"; // Hide item management section
    billingSection.style.display = "block"; // Show billing section
});
