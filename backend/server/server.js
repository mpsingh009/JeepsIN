const express = require('express');

const cors = require('cors');  
const { connect_to_db ,getProducts, insertProducts ,deleteProduct,editedProducts, insertQRCode, getProductById, getUserByUsername,insertOrder} = require("./db");
const { MongoClient } = require("mongodb");
const bcryptjs = require('bcryptjs');
const QRCode = require('qrcode');
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


// const userModel = require('./user');
const cartController = require('../controllers/cartController');


const app = express();
const PORT = process.env.SERVER_PORT || 5000;

app.use(cors());  // Enable CORS

app.use(express.json());



connect_to_db()
  .then(() => {
    // API Endpoints
    app.get("/api/products", async (req, res) => {
      try {
        const products = await getProducts();
        res.json(products);
      } catch (error) {
        console.error("Error getting products:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });


    app.get("/api/products/:id", async (req, res) => {
      try {
        const productId = req.params.id;
        const product = await getProductById(productId); 
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
      } catch (error) {
        console.error("Error getting product by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });



    //signup functionality
    app.post("/signup", async (req, res) => {
      try {
        const client = new MongoClient(process.env.DB_URL);
        const db = client.db();

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(req.body.password, salt);
        req.body.password = hashedPassword;

          const newUser = await db.collection("users").insertOne(req.body);
          res.json({ "user": newUser });
      } catch (err) {
          console.error(err);
          res.status(400).json({ "err": err.message });
      }
  });

  //login 
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    // Validate request body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
  
    try {
      const user = await getUserByUsername(username);
  
      // Check if the user exists
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      // Compare the provided password with the stored hash
      const isMatch = await bcryptjs.compare(password, user.password);
  
      // Check if the passwords match
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
  
      // Generate a JWT token (optional)
      // const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' });
  
      // Send a response with the user data (without the password)
      res.json({ _id: user._id, username: user.username, email: user.email });
  
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  //adding products
  app.post("/api/add_product",async (req,res)=>{

    const client = new MongoClient(process.env.DB_URL);
    const db = client.db();
  
    const insetedProduct = await insertProducts(req);
    res.json({result : insetedProduct})
  })

  //editting products
  app.put("/api/edit_product/:id",async (req,res)=>{

    const client = new MongoClient(process.env.DB_URL);
    const db = client.db();

    const edittedProduct = await editedProducts(req);
    res.json({result : edittedProduct})
  })

  //deleting products
  app.delete("/api/delete_product/:id",async (req,res)=>{
    const client = new MongoClient(process.env.DB_URL);
    const db = client.db();

    const deletedProduct = await deleteProduct(req);
    res.json({deletedProduct})
  })

  //generating QR Code
  app.post("/api/products/return_product", async (req, res) => {
    const client = new MongoClient(process.env.DB_URL);
    const db = client.db();

    const { value } = req.body;
    console.log("QR value",value);
    try {
      // Generate QR code
      const qrImage = await QRCode.toDataURL(value);

      //store qr code in database
      await insertQRCode(value, qrImage);

      // Send QR code back to the client
      res.json({ success: true, qrImage });

    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ success: false, error: "Error generating QR code" });
    }
  });

 
  //adding orders
  // app.post("/api/place_order",async (req,res)=>{

  //   const client = new MongoClient(process.env.DB_URL);
  //   const db = client.db();
  
  //   const insertOrder = await insertOrder(req);
  //   res.json({result : insertOrder})
  // })
  //adding orders
app.post("/api/place_order", async (req, res) => {
  try {
    const result = await insertOrder(req);
    res.json({ result });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});


    //cart routes
    app.post("/api/cart/add", cartController.addItemToCart);
    app.delete(
      "/api/cart/remove/:productId",
      cartController.removeItemFromCart
    );
    app.get("/api/cart", cartController.getCart);



    app.listen(PORT, () => {
      console.log(`Server started at port ${PORT}`);
    });

  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });


