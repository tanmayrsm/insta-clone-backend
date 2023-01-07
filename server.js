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
    console.log(`server is running, cors added for :: dev url :: PORT :: ${PORT}`);
})

app.use(cors());

const users = {};

const socketToRoom = {};

const userPersonalInfo = {};

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

	socket.on("join room", ({roomID, user}) => {
        console.log("Someone joined ::", " ::  usrs :: ", users);
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
            userPersonalInfo[roomID].push({[socket.id]: user});
        } else {
            users[roomID] = [socket.id];
            userPersonalInfo[roomID] = [{[socket.id]: user}];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        // 4- emit all users in this room
        socket.emit("all users", usersInThisRoom);
        socket.emit("all full users", userPersonalInfo[roomID]);
    });

    // 7- listen CREATED Peer from frontend
    socket.on("sending signal", payload => {
        // 8- user joined process complete
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
        console.log("User joined :: ",payload.callerID );
        const roomID = socketToRoom[socket.id];
        socket.emit("all full users", userPersonalInfo[roomID]);    
    });

    socket.on("returning signal", payload => {
        // 12- ACK emit after receiving signal of newly added Peer been added to Peer list
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
        const roomID = socketToRoom[socket.id];
        socket.emit("all full users", userPersonalInfo[roomID]);
    });

    socket.on('disconnect socket', () => {
        socket.disconnect();
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        console.log("User leaving ::", socket.id);
        socket.broadcast.emit('user left',socket.id);
        if(userPersonalInfo && userPersonalInfo[roomID]) {
            userPersonalInfo[roomID] = userPersonalInfo[roomID].filter(item => Object.keys(item)[0] !== socket.id);
            console.log('other userPersonaInfo ::',userPersonalInfo[roomID]);
            socket.emit("all full users", userPersonalInfo[roomID]);
        }
    });

    socket.on('change', (payload) => {
        socket.broadcast.emit('change',payload);
        const roomID = socketToRoom[socket.id];
        socket.emit("all full users", userPersonalInfo[roomID]);
    });

});
app.get(`/establish`, (req, res, next) => {
	if(storeSocket) {
		storeSocket.emit("me", storeSocket.id)
		// console.log("id emit :: ", storeSocket.id);
	}
	return res.json("ok emitted");	
});


// - call
//     - from
//         - ramUID
//             - roomID
//             - WHO all have currently joined : [ramUID]
//             - roomOwner : ramUID
//     - to
//         - dushtaUID  ...... ur app will always listen this...modal will pop up, in case it activates
//             - roomID
//             - WHO all.. : [ramUID]
//             - who calling : ramUID
        
// -----------------------------------------------------------------------

// cases - 

// - dushta picks call -  
//     1- if dushta picks the call -> to.dushtaUID will be deleted
//     2- dushtaUID will be added in from.ramUID.whoallInCall..[]
//     3- once dushta Leaves call ->
//         - he will leave from from.ramUID.whoallInCall
//         - his chat with ram, and vice versa - will have an Audio call entry, with call ended time
//         - if it was call wid only two participants -> call will also end for other guy
//         - call from and to will be deleted

// - dushta doesn't picks call, or ends call - 
//     1- if dushtas receiving call since 90 secs...automatically, call to him must be hanged up
//         - again if it was one to one -> call must end even for ram
//         - else nothing much for now 
//     2- during removal of to.dushta
//         - after 90 secs - add missed call for dushta as message...and small btn to call ram back
//         - if he cancels call (on modal) - add same audio call cancelled message for both ram and dushta



