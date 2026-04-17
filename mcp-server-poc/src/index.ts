#!/usr/bin/env node
/**
 * SPLink MCP Server PoC
 *
 * AI Agent向け決済サーバーのProof of Concept実装
 * - 商品検索
 * - 決済実行（同期/非同期）
 * - 決済状態確認
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  merchant: string;
}

interface Payment {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  amount: number;
  currency: string;
  method: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Mock Data Store
const products: Map<string, Product> = new Map([
  ["prod_001", {
    id: "prod_001",
    name: "プレミアムコーヒー豆 500g",
    price: 2500,
    currency: "JPY",
    description: "厳選されたアラビカ種100%のプレミアムコーヒー豆",
    merchant: "Coffee Masters Japan"
  }],
  ["prod_002", {
    id: "prod_002",
    name: "オーガニック緑茶セット",
    price: 3800,
    currency: "JPY",
    description: "静岡産有機栽培の緑茶詰め合わせ",
    merchant: "Tea Garden Shizuoka"
  }],
  ["prod_003", {
    id: "prod_003",
    name: "手作り和菓子アソート",
    price: 4200,
    currency: "JPY",
    description: "季節の和菓子12種類の詰め合わせ",
    merchant: "Wagashi Kyoto"
  }]
]);

const payments: Map<string, Payment> = new Map();

// Payment ID Generator
let paymentCounter = 1;
function generatePaymentId(): string {
  return `pay_${String(paymentCounter++).padStart(6, "0")}`;
}

// Create MCP Server
const server = new McpServer({
  name: "splink-payment-server",
  version: "0.1.0",
});

// Tool: Search Products
server.tool(
  "search_products",
  "商品を検索します。キーワードで商品名や説明文を検索できます。",
  {
    query: z.string().optional().describe("検索キーワード（省略時は全商品を返します）"),
    maxResults: z.number().optional().default(10).describe("最大結果数")
  },
  async ({ query, maxResults }) => {
    let results = Array.from(products.values());

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
      );
    }

    results = results.slice(0, maxResults);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          count: results.length,
          products: results
        }, null, 2)
      }]
    };
  }
);

// Tool: Get Product Details
server.tool(
  "get_product",
  "商品IDから商品詳細を取得します。",
  {
    productId: z.string().describe("商品ID（例: prod_001）")
  },
  async ({ productId }) => {
    const product = products.get(productId);

    if (!product) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "商品が見つかりません",
            productId
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          product
        }, null, 2)
      }]
    };
  }
);

// Tool: Create Payment (supports async payment methods)
server.tool(
  "create_payment",
  "決済を作成します。クレジットカード（即時）またはコンビニ決済（非同期）に対応。",
  {
    productId: z.string().describe("購入する商品のID"),
    paymentMethod: z.enum(["credit_card", "konbini", "bank_transfer"])
      .describe("決済方法: credit_card（即時）, konbini（コンビニ・非同期）, bank_transfer（銀行振込・非同期）"),
    customerEmail: z.string().email().describe("顧客のメールアドレス")
  },
  async ({ productId, paymentMethod, customerEmail }) => {
    const product = products.get(productId);

    if (!product) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "商品が見つかりません",
            productId
          }, null, 2)
        }]
      };
    }

    const now = new Date();
    const paymentId = generatePaymentId();

    // Determine initial status and expiration based on payment method
    let status: Payment["status"];
    let expiresAt: string | undefined;

    switch (paymentMethod) {
      case "credit_card":
        // Simulate instant payment
        status = "completed";
        break;
      case "konbini":
        // Convenience store payment - 72 hours to pay
        status = "pending";
        expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
        break;
      case "bank_transfer":
        // Bank transfer - 7 days to pay
        status = "pending";
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    const payment: Payment = {
      id: paymentId,
      status,
      amount: product.price,
      currency: product.currency,
      method: paymentMethod,
      productId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt
    };

    payments.set(paymentId, payment);

    // Build response based on payment method
    const response: Record<string, unknown> = {
      success: true,
      payment,
      product: {
        name: product.name,
        merchant: product.merchant
      }
    };

    // Add payment instructions for async methods
    if (paymentMethod === "konbini") {
      response.instructions = {
        message: "以下の情報をコンビニでお支払いください",
        paymentCode: `CVS-${paymentId.slice(-6)}`,
        amount: `${product.price.toLocaleString()}円`,
        deadline: expiresAt,
        supportedStores: ["セブンイレブン", "ローソン", "ファミリーマート", "ミニストップ"]
      };
    } else if (paymentMethod === "bank_transfer") {
      response.instructions = {
        message: "以下の口座にお振込みください",
        bankName: "SPLink銀行",
        branchName: "本店",
        accountType: "普通",
        accountNumber: "1234567",
        accountHolder: "カ）エスピーリンク",
        transferId: paymentId.slice(-6),
        amount: `${product.price.toLocaleString()}円`,
        deadline: expiresAt
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
);

// Tool: Check Payment Status
server.tool(
  "check_payment_status",
  "決済の状態を確認します。非同期決済の入金確認に使用します。",
  {
    paymentId: z.string().describe("決済ID（例: pay_000001）")
  },
  async ({ paymentId }) => {
    const payment = payments.get(paymentId);

    if (!payment) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "決済が見つかりません",
            paymentId
          }, null, 2)
        }]
      };
    }

    // Simulate random completion for pending payments (for demo purposes)
    if (payment.status === "pending" && Math.random() > 0.7) {
      payment.status = "completed";
      payment.updatedAt = new Date().toISOString();
    }

    const product = products.get(payment.productId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          payment,
          product: product ? {
            name: product.name,
            merchant: product.merchant
          } : null,
          statusDescription: getStatusDescription(payment.status)
        }, null, 2)
      }]
    };
  }
);

// Tool: List Payments
server.tool(
  "list_payments",
  "決済履歴を一覧表示します。",
  {
    status: z.enum(["pending", "processing", "completed", "failed"]).optional()
      .describe("フィルタする決済ステータス"),
    limit: z.number().optional().default(10).describe("最大取得件数")
  },
  async ({ status, limit }) => {
    let results = Array.from(payments.values());

    if (status) {
      results = results.filter(p => p.status === status);
    }

    // Sort by created date descending
    results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    results = results.slice(0, limit);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          count: results.length,
          payments: results.map(p => ({
            ...p,
            statusDescription: getStatusDescription(p.status)
          }))
        }, null, 2)
      }]
    };
  }
);

// Tool: Simulate Payment Completion (for testing)
server.tool(
  "simulate_payment_completion",
  "[テスト用] 非同期決済の入金をシミュレートします。",
  {
    paymentId: z.string().describe("決済ID")
  },
  async ({ paymentId }) => {
    const payment = payments.get(paymentId);

    if (!payment) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "決済が見つかりません",
            paymentId
          }, null, 2)
        }]
      };
    }

    if (payment.status !== "pending") {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "この決済は既に処理済みです",
            currentStatus: payment.status
          }, null, 2)
        }]
      };
    }

    payment.status = "completed";
    payment.updatedAt = new Date().toISOString();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          message: "決済が完了しました",
          payment
        }, null, 2)
      }]
    };
  }
);

// Helper function
function getStatusDescription(status: Payment["status"]): string {
  switch (status) {
    case "pending":
      return "お支払い待ち";
    case "processing":
      return "処理中";
    case "completed":
      return "完了";
    case "failed":
      return "失敗";
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SPLink MCP Server started");
}

main().catch(console.error);
