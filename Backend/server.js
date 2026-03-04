const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const searchRoutes = require("./routes/searchRoutes");
const priceRoutes = require("./routes/priceRoutes");
const scraperRoutes = require("./routes/scraperRoutes");
const storeRoutes = require("./routes/storeRoutes");
const compareRoutes = require("./routes/compareRoutes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.send("Price Comparison API Running");
});

app.use("/api", productRoutes); 
app.use("/api", searchRoutes);
app.use("/api", priceRoutes);
app.use("/api", scraperRoutes);
app.use("/api", storeRoutes);
app.use("/api", compareRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
