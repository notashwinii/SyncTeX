SyncTeX
=======

SyncTeX is a **collaborative LaTeX editor** designed to help multiple users edit LaTeX documents in real time. 

Installation Guide
------------------

To set up SyncTeX locally, follow these steps:

### **1\. Install Node.js and Yarn**

Ensure you have **Node.js** installed. If not, download and install it from [nodejs.org](https://nodejs.org/).

Then, install **Yarn** (if not already installed):

```   
npm install -g yarn
```

Verify installation:
```   
yarn --version
```

### **2\. Clone the Repository**

```
git clone https://github.com/notashwinii/SyncTeX.git  
cd SyncTeX
```

### **3\. Setup the Client (Frontend)**

Navigate to the client directory and install dependencies:

```
cd client  
yarn install
```

Start the client:

```  
yarn start
```

This will launch the frontend at http://localhost:3000/.

### **4\. Setup the Server (Backend)**

Navigate to the server directory and install dependencies:

```   
cd ../server
npm install
```

Run the backend server:

```   
node index.js
```

The server will start at http://localhost:3001/.

Running the Project
-------------------

Once both the **client** and **server** are running, open http://localhost:3000/ in your browser to use SyncTeX.

Contributing
------------

Contributions are welcome! To contribute:

1.  Fork the repository
    
2.  Create a new branch (git checkout -b feature-branch)
    
3.  Commit your changes (git commit -m "Added new feature")
    
4.  Push to the branch (git push origin feature-branch)
    
5.  Open a Pull Request
