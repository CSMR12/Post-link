import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "c18b1ad0fb217a178c390c32133b30c4",
    authDomain: "postlink-a7b74.firebaseapp.com",
    databaseURL: "https://postlink-a7b74-default-rtdb.firebaseio.com",
    projectId: "postlink-a7b74",
    storageBucket: "postlink-a7b74.firebasestorage.app",
    messagingSenderId: "520575766590",
    appId: "1:520575766590:web:ce3fb62a7bc3241d12c16f",
    measurementId: "G-X66P9GWS8J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elements
const spinner = document.querySelector('.spinner');

// Tab Switching Logic
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".content-left");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        spinner.style.display = 'block';
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        sections.forEach(section => section.classList.add("hidden"));
        document.getElementById(tab.dataset.target).classList.remove("hidden");
        spinner.style.display = 'none';
    });
});

// Image Preview
document.getElementById("imageInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function() {
        const img = document.getElementById("imagePreview");
        img.src = reader.result;
        img.style.display = "block";
    };

    if (file) {
        reader.readAsDataURL(file);
    }
});

// Submission Form Logic
document.getElementById("dataForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    spinner.style.display = 'block';

    const title = document.getElementById("titleInput").value.trim();
    const description = document.getElementById("descriptionInput").value.trim();
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];

    if (title === "" || description === "" || !file) {
        spinner.style.display = 'none';
        return;
    }

    // Upload Image to Imgbb
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=c18b1ad0fb217a178c390c32133b30c4`, {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    const imageUrl = result.data.url;

    const historyList = document.getElementById("historyList");
    if (historyList.children[0].textContent === "Loading...") {
        historyList.innerHTML = "";
    }

    const newItem = document.createElement("div");
    newItem.classList.add("history-item");
    newItem.innerHTML = `<h3>${title}</h3><p>${description}</p><img src="${imageUrl}" alt="Submitted Image">`;

    historyList.appendChild(newItem);

    // Save to Firestore
    const user = auth.currentUser;
    await addDoc(collection(db, "Submissions"), {
        userId: user.uid,
        title: title,
        description: description,
        imageUrl: imageUrl,
        timestamp: new Date()
    });

    document.getElementById("dataForm").reset();
    document.getElementById("imagePreview").style.display = "none";

    // Update Points
    const pointsEl = document.querySelector(".points");
    let currentPoints = parseInt(pointsEl.textContent);
    pointsEl.textContent = `${currentPoints + 10} Points`;
    document.querySelector(".profilePoints").textContent = `${currentPoints + 10}`;

    // Update points in Firestore
    const userDoc = doc(db, "Users", user.uid);
    await updateDoc(userDoc, {
        points: currentPoints + 10
    });

    spinner.style.display = 'none';
});

// Profile Form Logic
const profileForm = document.getElementById("profileForm");
const profileEmail = document.getElementById("profileEmail");
const profileUsername = document.getElementById("profileUsername");
const profilePassword = document.getElementById("profilePassword");
const editProfileBtn = document.getElementById("editProfileBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Load user data from Firebase Auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        profileEmail.textContent = user.email;
        profileUsername.value = user.displayName || user.email;

        // Load points from Firestore
        const userDoc = doc(db, "Users", user.uid);
        const userSnap = await getDocs(userDoc);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            document.querySelector(".points").textContent = `${userData.points} Points`;
            document.querySelector(".profilePoints").textContent = `${userData.points}`;
        }
    }
});

editProfileBtn.addEventListener("click", () => {
    profileUsername.removeAttribute("readonly");
    profilePassword.removeAttribute("readonly");
    editProfileBtn.classList.add("hidden");
    saveProfileBtn.classList.remove("hidden");
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    spinner.style.display = 'block';
    
    // Save the updated username and password
    profileUsername.setAttribute("readonly", true);
    profilePassword.setAttribute("readonly", true);
    editProfileBtn.classList.remove("hidden");
    saveProfileBtn.classList.add("hidden");

    // Update user information in Firestore
    const user = auth.currentUser;
    const userDoc = doc(db, "Users", user.uid);
    await updateDoc(userDoc, {
        displayName: profileUsername.value
        // Note: Update the password in your auth system (Firebase, etc.) if necessary
    });

    // Update user information in localStorage
    user.displayName = profileUsername.value;
    localStorage.setItem('user', JSON.stringify(user));

    alert('Profile updated successfully!');
    spinner.style.display = 'none';
});

// Fetch History from Firestore
async function fetchHistory() {
    const historyList = document.getElementById("historyList");
    const user = auth.currentUser;
    const q = query(collection(db, "Submissions"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    historyList.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const historyItem = document.createElement("div");
        historyItem.classList.add("history-item");
        historyItem.innerHTML = `<h3>${data.title}</h3><img src="${data.imageUrl}" alt="Submitted Image">`;
        historyList.appendChild(historyItem);
    });

    if (historyList.innerHTML === "") {
        historyList.innerHTML = "<p>No submissions yet.</p>";
    }
}

// Fetch Requests from Firestore
async function fetchRequests() {
    const requestList = document.getElementById("requestList");
    const querySnapshot = await getDocs(collection(db, "Requests"));

    requestList.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const requestItem = document.createElement("div");
        requestItem.classList.add("history-item");
        requestItem.innerHTML = `<h3>${data.title}</h3>`;
        requestList.appendChild(requestItem);
    });

    if (requestList.innerHTML === "") {
        requestList.innerHTML = "<p>No requests yet.</p>";
    }
}

// Fetch Messages from Firestore
async function fetchMessages() {
    const messageList = document.getElementById("messageList");
    const user = auth.currentUser;
    const q = query(collection(db, "Messages"), where("recipient", "==", user.email));
    const querySnapshot = await getDocs(q);

    messageList.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const messageItem = document.createElement("div");
        messageItem.classList.add("history-item");
        if (!data.read) {
            messageItem.classList.add("unread");
        }
        messageItem.innerHTML = `<h3>${data.sender}</h3><p>${data.message}</p>`;
        messageList.appendChild(messageItem);
    });

    if (messageList.innerHTML === "") {
        messageList.innerHTML = "<p>No messages yet.</p>";
    }
}

// Fetch history, requests, and messages on load
fetchHistory();
fetchRequests();
fetchMessages();

// Real-time updates for Messages
const messagesQuery = query(collection(db, "Messages"));
onSnapshot(messagesQuery, (snapshot) => {
    fetchMessages();
});

// Real-time updates for Requests
const requestsQuery = query(collection(db, "Requests"));
onSnapshot(requestsQuery, (snapshot) => {
    fetchRequests();
});

// Message Form Logic
document.getElementById("messageForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    spinner.style.display = 'block';

    const recipientEmail = document.getElementById("recipientEmail").value.trim();
    const message = document.getElementById("messageInput").value.trim();

    if (recipientEmail === "" || message === "") {
        spinner.style.display = 'none';
        return;
    }

    // Check if recipient exists
    const userQuery = query(collection(db, "Users"), where("email", "==", recipientEmail));
    const querySnapshot = await getDocs(userQuery);

    if (querySnapshot.empty) {
        alert("Recipient not found.");
        spinner.style.display = 'none';
        return;
    }

    const recipient = querySnapshot.docs[0].data();
    const user = auth.currentUser;

    // Save message to Firestore
    await addDoc(collection(db, "Messages"), {
        sender: user.email,
        recipient: recipientEmail,
        message: message,
        read: false,
        timestamp: new Date()
    });

    alert(`Message Sent to ${recipientEmail}`);
    document.getElementById("messageForm").reset();
    spinner.style.display = 'none';
});
``` ▋
