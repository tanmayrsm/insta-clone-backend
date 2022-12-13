const express = require("express")
const http = require("http")
const app = express()
const server = http.createServer(app)
const cors = require('cors');
const PORT = process.env.PORT || 5000;
let storeSocket;

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
})


server.listen(PORT, () => {
    console.log(`server is running on port 5000, cors added for :: http://localhost:3000 :: PORT :: ${PORT}`);
})

app.use(cors());

const users = {};

const socketToRoom = {};

io.on("connection", (socket) => {
	
	storeSocket = socket;
	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded")
	})

	socket.on("callUser", (data) => {
		io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name })
	})

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal)
	})

	socket.on('join-room', (roomId, userId) => {
		console.log(`Socket ${socket.id} joining ${roomId}`);
		socket.join(roomId);
		socket.to(roomId).broadcast.emit('user-connected', userId);
	});

	socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);
        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        setTimeout(() => {
            io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
            console.log("User joined :: ",payload.callerID );
        }, 5000)    // this time must increase as oer no of users for now
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        socket.broadcast.emit('user left',socket.id)
    });

    socket.on('change', (payload) => {
        socket.broadcast.emit('change',payload)
    });

});
app.get(`/establish`, (req, res, next) => {
	if(storeSocket) {
		storeSocket.emit("me", storeSocket.id)
		// console.log("id emit :: ", storeSocket.id);
	}
	return res.json("ok emitted");	
})