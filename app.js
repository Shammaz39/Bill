import { db } from './firebase-config.js'; // Firebase config
import { collection, onSnapshot, setDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const itemForm = document.getElementById("item-form");
const itemContainer = document.getElementById("item-container");
const itemInput = document.getElementById("item-input");
const itemSuggestions = document.getElementById("item-suggestions");
const billContainer = document.getElementById("bill-container");
const addItemBtn = document.getElementById("add-item-btn");
const totalPriceElement = document.getElementById("total-price");
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
    billContainer.innerHTML += `
        <li>${itemName} - ₹${itemPrice} 
            <button class="remove-item-btn">Remove</button>
        </li>
    `;
    totalPriceElement.innerText = `₹${total}`;

    itemInput.value = ""; // Clear input field

    // Attach event listener for removing item from bill
    attachRemoveEventListeners();
}

// Attach event listeners to remove buttons
function attachRemoveEventListeners() {
    const removeButtons = document.querySelectorAll('.remove-item-btn');
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const itemLi = e.target.closest('li');
            const itemText = itemLi.innerText.split(' - ₹');
            const itemPrice = parseFloat(itemText[1]);

            total -= itemPrice;
            billContainer.removeChild(itemLi);

            totalPriceElement.innerText = `₹${total}`;
        });
    });
}

// Print Bill
async function printBill() {
    const customerName = document.getElementById("customer-name").value.trim() || "Guest";
    const companyName = document.getElementById("company-name").value.trim() || "Your Company"; // Default fallback

    if (!companyName) {
        companyName = "CompanyName"
    }

    const billData = {
        companyName,
        customerName,
        items: Array.from(billContainer.children).map((li) => {
            const [name, price] = li.innerText.split(" - ₹");
            return { name: name.trim(), price: parseFloat(price.trim()) };
        }),
        total,
        date: new Date().toISOString(),
    };

    try {
        // Generate a unique document ID (bill ID)
        const formattedDate = new Date().toISOString().replace(/[^0-9]/g, "");
        const billRef = doc(db, "bills", formattedDate);
        await setDoc(billRef, billData);

        alert("Bill saved!");

        // Generate PDF
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();

        // Header
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(20);
        pdfDoc.text(companyName, 105, 20, { align: "center" });

        // Bill Info Section
        pdfDoc.setFontSize(12);
        pdfDoc.setTextColor(100);
        const formattedDisplayDate = new Date().toLocaleString();
        pdfDoc.text(`Bill ID: ${formattedDate}`, 20, 30);
        pdfDoc.text(`Date: ${formattedDisplayDate}`, 20, 40);
        pdfDoc.text(`Customer: ${customerName}`, 20, 50);

        // Horizontal line
        pdfDoc.line(20, 55, 190, 55);

        // Table Headers
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Item Name", 20, 65);
        pdfDoc.text("Price", 160, 65, { align: "right" });

        // Horizontal line
        pdfDoc.line(20, 70, 190, 70);

        // Table Content
        let yPos = 75;
        billData.items.forEach((item) => {
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.text(item.name, 20, yPos);
            pdfDoc.text(`Rs.${item.price}`, 160, yPos, { align: "right" });
            yPos += 10;
        });

        // Total Section
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Total:", 140, yPos + 5, { align: "right" });
        pdfDoc.text(`Rs.${billData.total}`, 160, yPos + 5, { align: "right" });

        // Save as PDF
        pdfDoc.save(`${formattedDate}.pdf`);
    } catch (error) {
        console.error("Error generating bill: ", error);
        alert("Error generating bill.");
    }
}



// Switch between item management and billing
document.getElementById("view-items-btn").addEventListener("click", () => {
    document.getElementById("item-management-section").style.display = "block";
    document.getElementById("billing-section").style.display = "none";
});

document.getElementById("view-billing-btn").addEventListener("click", () => {
    document.getElementById("item-management-section").style.display = "none";
    document.getElementById("billing-section").style.display = "block";
});

// Initialize
loadItems();
addItemBtn.addEventListener("click", addItemToBill);
document.getElementById("print-bill-btn").addEventListener("click", printBill);
