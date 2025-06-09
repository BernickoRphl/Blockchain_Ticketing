const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

app.use("/api", require("./routes/mint-ticket"));
//app.use("/api", require("./routes/set-limits"));
//app.use("/api", require("./routes/tickets"));
//app.use("/api", require("./routes/transfer-tickets"));
//app.use("/api", require("./routes/validate-tickets"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));