import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Stripe } from 'stripe';

dotenv.config();

const db = new Database('./server/data/users.db');

db.exec(`
	create table if not exists users (
		id integer primary key autoincrement,
		email text unique not null,
		password_hash text not null,
		has_paid integer default 0
	);
`);

const cashWrap = new Stripe(process.env.CASH_WRAP_SECRET_KEY);

const app = express();

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', '*');

	next();
});

function authenticate(req, res, next) {
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		return res
			.status(401)
			.json({ error: 'no token' });
	}

	try {
		const decoded = jwt.verify(token, process.env.SECRET);

		req.email = decoded.email;

		next();
	} catch (err) {
		console.error(err);

		res
			.status(401)
			.json({ error: 'invalid token' });
	}
}

app.use(express.json());

app.get('/', (req, res) => {
	res.send('connected');
});

app.post('/sign-up', async (req, res) => {
	const { email, password } = req.body;

	const hashed = await bcrypt.hash(password, 10);

	db.prepare(`
		insert into users (email, password_hash)
		values (?, ?)
	`).run(
		email,
		hashed,
	);

	res.json({ wasSuccessful: true });
});

app.post('/sign-in', async (req, res) => {
	const { email, password } = req.body;

	const user = db.prepare(`
		select *
		from users
		where email = ?
	`).get(
		email,
	);

	if (user && await bcrypt.compare(password, user.password_hash)) {
		const token = jwt.sign({ email }, process.env.SECRET);

		res.json({ token, hasPaid: !!user.has_paid });
	}
});

app.post('/create-checkout', authenticate, async (req, res) => {
	const session = await cashWrap.checkout.sessions.create({
		line_items: [
			{
				price: 'price_1STCk2Cu0EmtIitpnqr9q9Qj',
				quantity: 1,
			},
		],
		mode: 'subscription',
		success_url: 'http://localhost:8080/success.html?payment_session_id={CHECKOUT_SESSION_ID}',
		cancel_url: 'http://localhost:8080',
	});

	res.json({ url: session.url });
});

app.get('/verify', async (req, res) => {
	const session = await cashWrap.checkout.sessions.retrieve(req.query['payment_session_id']);

	res.json({ hasPaid: session.payment_status === 'paid' });
});

app.listen(3000, () => {
	console.log('running');
});
