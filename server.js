const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Store waiting users
let waitingUsers = [];

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    let userProfile = null;
    let userFilters = null;
    
    socket.on('user-ready', (profile) => {
        userProfile = profile;
    });
    
    socket.on('find-stranger', (profile, filters) => {
        userProfile = profile;
        userFilters = filters;
        
        // Find matching user
        let matchedPartner = null;
        let matchIndex = -1;
        
        for (let i = 0; i < waitingUsers.length; i++) {
            const waitingUser = waitingUsers[i];
            
            if (filters) {
                if (filters.gender !== 'all' && filters.gender !== waitingUser.userProfile.gender) {
                    continue;
                }
                if (filters.country !== 'all' && filters.country !== waitingUser.userProfile.country) {
                    continue;
                }
            }
            
            matchedPartner = waitingUser;
            matchIndex = i;
            break;
        }
        
        if (matchedPartner) {
            waitingUsers.splice(matchIndex, 1);
            
            socket.partner = matchedPartner;
            matchedPartner.partner = socket;
            
            socket.emit('matched', matchedPartner.userProfile);
            matchedPartner.emit('matched', userProfile);
        } else {
            waitingUsers.push(socket);
        }
    });
    
    socket.on('next-stranger', () => {
        if (socket.partner) {
            socket.partner.emit('stranger-disconnected');
            socket.partner.partner = null;
            socket.partner = null;
        }
        
        if (waitingUsers.length > 0) {
            let matchedPartner = null;
            let matchIndex = -1;
            
            for (let i = 0; i < waitingUsers.length; i++) {
                const waitingUser = waitingUsers[i];
                
                if (userFilters) {
                    if (userFilters.gender !== 'all' && userFilters.gender !== waitingUser.userProfile.gender) {
                        continue;
                    }
                    if (userFilters.country !== 'all' && userFilters.country !== waitingUser.userProfile.country) {
                        continue;
                    }
                }
                
                matchedPartner = waitingUser;
                matchIndex = i;
                break;
            }
            
            if (matchedPartner) {
                waitingUsers.splice(matchIndex, 1);
                socket.partner = matchedPartner;
                matchedPartner.partner = socket;
                
                socket.emit('matched', matchedPartner.userProfile);
                matchedPartner.emit('matched', userProfile);
            } else {
                waitingUsers.push(socket);
            }
        } else {
            waitingUsers.push(socket);
        }
    });
    
    socket.on('stop-chatting', () => {
        if (socket.partner) {
            socket.partner.emit('stranger-disconnected');
            socket.partner.partner = null;
            socket.partner = null;
        }
    });
    
    socket.on('offer', (offer) => {
        if (socket.partner) {
            socket.partner.emit('offer', offer, userProfile);
        }
    });
    
    socket.on('answer', (answer) => {
        if (socket.partner) {
            socket.partner.emit('answer', answer);
        }
    });
    
    socket.on('ice-candidate', (candidate) => {
        if (socket.partner) {
            socket.partner.emit('ice-candidate', candidate);
        }
    });
    
    socket.on('message', (message) => {
        if (socket.partner) {
            socket.partner.emit('message', message);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        waitingUsers = waitingUsers.filter(user => user !== socket);
        
        if (socket.partner) {
            socket.partner.emit('stranger-disconnected');
            socket.partner.partner = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Vyntra.tv server running on port ${PORT}`);
    console.log(`👉 Open http://localhost:${PORT}`);
});
