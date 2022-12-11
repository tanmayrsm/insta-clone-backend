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
// app.get("/", (req, res, next) => {
//     res.json(["Tony","Lisa","Michael","Ginger","Food"]);
// });
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
});
app.get(`/establish`, (req, res, next) => {
	if(storeSocket) {
		storeSocket.emit("me", storeSocket.id)
		console.log("id emit :: ", storeSocket.id);
	}
	return res.json("ok emitted");	
})