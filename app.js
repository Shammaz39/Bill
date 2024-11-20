import { db } from './firebase-config.js'; // Firebase config
import { collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js"; 

const itemForm = document.getElementById("item-form");
const itemContainer = document.getElementById("item-container");
const itemSelector = document.getElementById("item-selector");
const billContainer = document.getElementById("bill-container");
const addItemBtn = document.getElementById("add-item-btn");
let total = 0;

// Add Item to Firestore
itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemName = document.getElementById("item-name").value;
    const itemPrice = parseFloat(document.getElementById("item-price").value);

    if (!itemName || isNaN(itemPrice)) {
        alert("Please enter valid item details!");
        return;
    }

    try {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "items"), {
            name: itemName,
            price: itemPrice
        });
        console.log("Item added with ID:", docRef.id);
        loadItems(); // Reload items after adding
    } catch (error) {
        console.error("Error adding item: ", error);
        alert("Error adding item.");
    }

    // Clear form
    itemForm.reset();
});

// Load Items to List
async function loadItems() {
    itemContainer.innerHTML = ""; // Clear the container before loading items
    const itemsRef = collection(db, "items");

    try {
        const querySnapshot = await getDocs(itemsRef);
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `${item.name} - ₹${item.price} 
                            <button class="delete-btn" data-id="${doc.id}">Delete</button>`;
            itemContainer.appendChild(li);
        });

        // Attach event listeners to the delete buttons
        attachDeleteEventListeners();
    } catch (error) {
        console.error("Error loading items: ", error);
        alert("Error loading items.");
    }
}

// Attach event listeners to delete buttons
function attachDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.target.getAttribute('data-id');
            deleteItem(itemId);
        });
    });
}

// Delete Item from Firestore
async function deleteItem(itemId) {
    try {
        const itemRef = doc(db, "items", itemId);
        await deleteDoc(itemRef);
        alert("Item deleted successfully!");
        loadItems(); // Reload items after deletion
    } catch (error) {
        alert("Error deleting item: " + error.message);
    }
}

// Load Items for Billing Dropdown
async function loadBillingItems() {
    itemSelector.innerHTML = ""; // Clear the dropdown before loading items
    const itemsRef = collection(db, "items");

    try {
        const querySnapshot = await getDocs(itemsRef);
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const option = document.createElement("option");
            option.value = JSON.stringify({ name: item.name, price: item.price });
            option.text = `${item.name} - ₹${item.price}`;
            itemSelector.add(option); // Add option to dropdown
        });
    } catch (error) {
        alert("Error loading items for billing.");
    }
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
        await addDoc(collection(db, "bills"), billData); // Save the bill in Firestore
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
        billData.items.forEach((item, index) => {
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
    loadItems(); // Load items for listing
    loadBillingItems(); // Load items for billing dropdown

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
viewItemsBtn.addEventListener("click", () => {
    itemManagementSection.style.display = "block"; // Show item management section
    billingSection.style.display = "none"; // Hide billing section
});

viewBillingBtn.addEventListener("click", () => {
    itemManagementSection.style.display = "none"; // Hide item management section
    billingSection.style.display = "block"; // Show billing section
});
