process.env.NODE_ENV = true;

process.on('uncaughtException', function (err){
    console.log(err);
});

const request = require("supertest");

const app = require("../app");
const db = require("../db");
const { update } = require("../models/book");

// isbn of sample book
let book_isbn;

beforeEach(async () =>{ // inserts new book query for every test and isbn is saved to `book_isbn`
    let result = await db.query(`
        INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)
        VALUES 
            ('12345678', 'https://amazon.com/example', 'John', 'English', 100, 'Example Publishers', 'Example Books', 2008)
        RETURNING isbn`);
    
    book_isbn = result.rows[0].isbn;
});

describe("POST /books", function() {
    test("Creates a new book", async function (){
        const response = await request(app)
        .post(`/books`)
        .send({
            isbn: '87654321',
            amazon_url: 'https://example.com',
            author: "Johnathan",
            language: "English",
            pages: 3000,
            publisher: "Rust Inc.",
            title: "My life",
            year: 2077
        });
        expect(response.statusCode).toBe(201);
        expect(response.body.book).toHaveProperty("isbn");
    });

    test("Prevents creating book without required title", async function(){
        const response = await request(app)
        .post('/books')
        .send({year:2000});
        expect(response.statusCode).toBe(400);
    });
});
describe("GET /books", function(){
    test("Get a list of 1 book from database", async function(){
        const response = await request(app)
        .get('/books');
        const books = response.body.books; // returns list of book objects
        expect(books[0]).toHaveProperty('isbn');
        expect(books[0]).toHaveProperty('amazon_url');
        expect(books[0]).toHaveProperty('title');
        expect(books[0]).toHaveProperty('author');
        expect(books[0]).toHaveProperty('publisher');
    });
});
describe("GET /books/:isbn", function(){
    test("Gets 1 specific books from database", async function(){
        const response = await request(app)
        .get(`/books/${book_isbn}`);
        const book = response.body.book;
        expect(book).toHaveProperty('isbn');
        expect(book.isbn).toBe(book_isbn);
    });
    test("Responds with 404 if cannot find book", async function(){
        const response = await request(app)
        .get(`/books/0000000000`);
        expect(response.statusCode).toBe(404);
    })
});
describe("PUT /books/:isbn", function(){
    test("Updates book in database", async function(){
        const response = await request(app)
        .put(`/books/${book_isbn}`)
        .send({
            isbn: '87654321',
            amazon_url: 'https://example.com',
            author: "Johnathan",
            language: "English",
            pages: 3000,
            publisher: "Rust Inc.",
            title: "OUR LIFE",
            year: 2077
        });
        expect(response.body.book.title).toBe("OUR LIFE");
        expect(response.body.book).toHaveProperty("isbn");
    });
});
describe("DELETE /books/:isbn", function(){
    test("Deletes book in database and returns undefined", async function(){
        // removing book from database first
        // test to see if book is in database by running a get request
        const response = await request(app)
        .delete(`books/${book_isbn}`);
        expect(response.body).toEqual({"message":"Book deleted"});
    });
});

afterEach(async function(){
    await db.query("DELETE FROM books");
});

afterAll(async function(){
    await db.end();
})