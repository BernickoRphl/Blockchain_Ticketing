const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const validateTicketRoutes = require('./routes/validate-ticket');

app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/validate-ticket', validateTicketRoutes);

// DB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected!'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
