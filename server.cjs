const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const dataFile = path.join(__dirname, 'data', 'products.json');
const port = 3001;

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(data === undefined ? '' : JSON.stringify(data));
}

async function readProducts() {
  const products = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  if (!Array.isArray(products)) {
    throw new Error('Файл products.json должен содержать массив товаров.');
  }
  return products;
}

async function writeProducts(products) {
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, dataFile);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Слишком большой запрос.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Передан некорректный JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function parseProduct(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    value.name.trim().length > 100 ||
    typeof value.price !== 'number' ||
    !Number.isFinite(value.price) ||
    value.price < 0
  ) {
    return null;
  }

  return { name: value.name.trim(), price: value.price };
}

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204);
    return;
  }

  const url = new URL(request.url, 'http://localhost');
  const match = url.pathname.match(/^\/api\/products(?:\/(\d+))?$/);
  if (!match) {
    sendJson(response, 404, { error: 'Маршрут не найден.' });
    return;
  }

  const id = match[1] === undefined ? null : Number(match[1]);

  if (request.method === 'GET' && id === null) {
    sendJson(response, 200, await readProducts());
    return;
  }

  if (request.method === 'POST' && id === null) {
    const product = parseProduct(await readBody(request));
    if (!product) {
      sendJson(response, 400, { error: 'Укажите название и цену не меньше нуля.' });
      return;
    }

    const products = await readProducts();
    const newProduct = {
      id: products.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1,
      ...product
    };
    products.push(newProduct);
    await writeProducts(products);
    sendJson(response, 201, newProduct);
    return;
  }

  if (request.method === 'PUT' && id !== null) {
    const product = parseProduct(await readBody(request));
    if (!product) {
      sendJson(response, 400, { error: 'Укажите название и цену не меньше нуля.' });
      return;
    }

    const products = await readProducts();
    const index = products.findIndex(item => item.id === id);
    if (index === -1) {
      sendJson(response, 404, { error: 'Товар не найден.' });
      return;
    }

    const updatedProduct = { id, ...product };
    products[index] = updatedProduct;
    await writeProducts(products);
    sendJson(response, 200, updatedProduct);
    return;
  }

  if (request.method === 'DELETE' && id !== null) {
    const products = await readProducts();
    const remainingProducts = products.filter(item => item.id !== id);
    if (remainingProducts.length === products.length) {
      sendJson(response, 404, { error: 'Товар не найден.' });
      return;
    }

    await writeProducts(remainingProducts);
    sendJson(response, 204);
    return;
  }

  sendJson(response, 405, { error: 'Метод не поддерживается.' });
}

http.createServer((request, response) => {
  handleRequest(request, response).catch(error => {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'Ошибка сервера.' });
    } else {
      response.destroy(error);
    }
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`API запущен на http://127.0.0.1:${port}`);
});
