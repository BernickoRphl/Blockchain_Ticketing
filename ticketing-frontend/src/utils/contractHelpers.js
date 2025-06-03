// // utils/contractHelpers.js
// export const getUserTickets = async (contract, userAddress) => {
//   try {
//     console.log('Getting tickets for address:', userAddress);
    
//     // Method 1: Menggunakan balanceOf dan tokenOfOwnerByIndex
//     const balance = await contract.balanceOf(userAddress);
//     console.log('User balance:', balance.toString());
    
//     const tickets = [];
//     for (let i = 0; i < balance; i++) {
//       const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
//       const tokenURI = await contract.tokenURI(tokenId);
      
//       tickets.push({
//         tokenId: tokenId.toString(),
//         tokenURI,
//         owner: userAddress
//       });
//     }
    
//     console.log('Found tickets:', tickets);
//     return tickets;
    
//   } catch (error) {
//     console.error('Error getting user tickets:', error);
    
//     // Method 2: Jika method 1 gagal, coba dengan events
//     try {
//       const filter = contract.filters.Transfer(null, userAddress);
//       const events = await contract.queryFilter(filter);
      
//       const tickets = events.map(event => ({
//         tokenId: event.args.tokenId.toString(),
//         owner: userAddress
//       }));
      
//       console.log('Tickets from events:', tickets);
//       return tickets;
//     } catch (eventError) {
//       console.error('Error getting tickets from events:', eventError);
//       return [];
//     }
//   }
// };