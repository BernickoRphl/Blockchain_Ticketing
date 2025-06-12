// App.js
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MintTicket from "./components/MintTicket";
import TransferTicket from "./components/TransferTicket";
import ValidateTicket from "./components/ValidateTicket";
import EventChainApp from "./components/EventChainApp";
import CustomerApp from "./components/CustomerApp";
import AdminPanel from "./components/AdminPanel";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerApp />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/event" element={<EventChainApp />} />
        <Route path="/mint" element={<MintTicket />} />
        <Route path="/transfer" element={<TransferTicket />} />
        <Route path="/validate" element={<ValidateTicket />} />
      </Routes>
    </Router>
  );
}

export default App;