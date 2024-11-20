import { db } from './firebase-config.js'; // Firebase config
import { collection, onSnapshot, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const itemForm = document.getElementById("item-form");
const itemContainer = document.getElementById("item-container");
const itemInput = document.getElementById("item-input");
const itemSuggestions = document.getElementById("item-suggestions");
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
        itemSuggestions.innerHTML = ""; // Clear datalist
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

            // Add item to datalist
            const option = document.createElement("option");
            option.value = `${itemName} - ₹${item.price}`;
            option.setAttribute("data-price", item.price);
            itemSuggestions.appendChild(option);
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

// Add Item to Bill
function addItemToBill() {
    const selectedOption = Array.from(itemSuggestions.children).find(
        option => option.value === itemInput.value
    );

    if (!selectedOption) {
        alert("Please select a valid item from the suggestions.");
        return;
    }

    const itemName = selectedOption.value.split(" - ₹")[0];
    const itemPrice = parseFloat(selectedOption.getAttribute("data-price"));

    total += itemPrice;
    billContainer.innerHTML += `<li>${itemName} - ₹${itemPrice}</li>`;
    document.getElementById("total-price").innerText = `₹${total}`;

    itemInput.value = ""; // Clear input field
}

// Print Bill
async function printBill() {
    const billData = {
        items: Array.from(billContainer.children).map((li) => {
            const [name, price] = li.innerText.split(" - ₹");
            return { name: name.trim(), price: parseFloat(price.trim()) };
        }),
        total,
        date: new Date().toISOString(),
    };

    try {
        const formattedDate = new Date().toISOString().replace(/[^0-9]/g, "_");
        const billRef = doc(db, "bills", formattedDate);
        await setDoc(billRef, billData);

        alert("Bill saved!");

        // Generate PDF
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        // Header
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(20);
        pdfDoc.text("Janatha Garage", 105, 20, { align: "center" });

        // Sub-header with date
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(12);
        pdfDoc.setTextColor(100);
        const formattedDisplayDate = new Date().toLocaleString();
        pdfDoc.text(`Date: ${formattedDisplayDate}`, 20, 30);

        // Horizontal line
        pdfDoc.line(20, 35, 190, 35);

        // Bill Details Header
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(14);
        pdfDoc.text("Bill Details:", 20, 45);

        // Item Details
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setTextColor(50);
        let yOffset = 55;
        billData.items.forEach((item, index) => {
            const itemText = `${index + 1}. ${item.name} - ₹${item.price.toFixed(2)}`;
            pdfDoc.text(itemText, 20, yOffset);
            yOffset += 10;
        });

        // Total Amount Section
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(50, 150, 50); // Green for total
        pdfDoc.text(`Total: ₹${billData.total.toFixed(2)}`, 20, yOffset + 10);

        // Footer
        pdfDoc.setFont("helvetica", "italic");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor(150);
        pdfDoc.text("Thank you for visiting Janatha Garage!", 105, yOffset + 30, { align: "center" });
        // pdfDoc.text("Generated using our billing system.", 105, yOffset + 40, { align: "center" });

        // Save PDF with timestamped filename
        const safeDate = new Date().toISOString().replace(/[^0-9]/g, "_");
        pdfDoc.save(`bill_${safeDate}.pdf`);

        // Reset Bill UI
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
