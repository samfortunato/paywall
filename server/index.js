import http from 'http';
import Stripe from 'stripe';

const users = new Map();
const cashWrap = new Stripe('sryhadtodelete');

const server = http.createServer(async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');

	let requestBody = '';
	for await (const chunk of req) { requestBody += chunk; }
	const body = JSON.parse(requestBody || '{}');

	if (req.url === '/sign-up') {
		const { email, password } = body;

		if (users.has(email)) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ wasSuccessful: false, reason: 'email already exists' }));
		} else {
			users.set(email, { password, isPaid: false });

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ wasSuccessful: true }));
		}
	}

	if (req.url === '/sign-in') {
		const { email, password } = body;

		const user = users.get(email);

		if (user && user.password === password) {

		}
	}

	if (req.method === 'POST' && req.url === '/create-checkout') {
		const session = await cashWrap.checkout.sessions.create({
			line_items: [
				{
					price: 'price_1STCk2Cu0EmtIitpnqr9q9Qj',
					quantity: 1,
				},
			],
			mode: 'subscription',
			success_url: 'http://localhost:8080/success.html?session_id={CHECKOUT_SESSION_ID}',
			cancel_url: 'http://localhost:8080',
		});

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ url: session.url }));
	}

	if (req.url?.startsWith('/verify')) {
		const url = new URL(req.url, `http://${req.headers.host}`);
		const sessionId = url.searchParams.get('session_id');

		const session = await cashWrap.checkout.sessions.retrieve(sessionId);

		users.

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ paid: session.payment_status === 'paid' }));
	}
});

server.listen(3000);
