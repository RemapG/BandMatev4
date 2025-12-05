
import { GoogleGenAI } from "@google/genai";
import { Band } from "../types";

const getApiKey = () => {
  return process.env.API_KEY || ''; 
};

export const generateSalesAnalysis = async (band: Band): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key not found.";

  const ai = new GoogleGenAI({ apiKey });

  // Prepare data summary
  const totalRevenue = band.sales.reduce((acc, s) => acc + s.total, 0);
  
  // Aggregate by Date
  const salesByDate: Record<string, number> = {};
  band.sales.forEach(s => {
    const date = s.timestamp.split('T')[0];
    salesByDate[date] = (salesByDate[date] || 0) + s.total;
  });

  // Aggregate by Variant/Size
  const variantSales: Record<string, number> = {};
  band.sales.forEach(sale => {
    sale.items.forEach(item => {
      const key = `${item.name} [${item.variantLabel}]`;
      variantSales[key] = (variantSales[key] || 0) + item.quantity;
    });
  });

  const topSellers = Object.entries(variantSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, qty]) => `${name}: ${qty} шт.`)
    .join(', ');

  const dateStats = Object.entries(salesByDate)
    .map(([d, v]) => `${d}: ${v}р`)
    .join('; ');

  const prompt = `
    Ты менеджер музыкальной группы. Проанализируй продажи мерча.
    
    Данные:
    - Общая выручка: ${totalRevenue} руб.
    - Топ продаж (товар+размер): ${topSellers}
    - Динамика продаж по дням: ${dateStats}
    - Всего чеков: ${band.sales.length}

    Напиши очень краткий отчет (3-4 предложения). Отметь, были ли успешные концерты (резкие скачки продаж в конкретные даты) и какие размеры/товары нужно дозаказать.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Не удалось сгенерировать анализ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ошибка при обращении к ИИ аналитику.";
  }
};
