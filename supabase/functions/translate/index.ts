import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subtitles, targetLanguage, sourceLanguage } = await req.json();

    if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subtitles provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare subtitle texts for translation
    const textsToTranslate = subtitles.map((sub: { text: string }) => sub.text);
    
    const languageNames: Record<string, string> = {
      'zh': '中文',
      'en': '英语',
      'ja': '日语',
      'ko': '韩语',
      'fr': '法语',
      'de': '德语',
      'es': '西班牙语',
      'pt': '葡萄牙语',
      'ru': '俄语',
      'ar': '阿拉伯语',
      'it': '意大利语',
      'th': '泰语',
      'vi': '越南语',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : '自动检测';

    const systemPrompt = `你是一个专业的字幕翻译专家。请将以下字幕从${sourceLangName}翻译成${targetLangName}。

要求：
1. 保持原文的语气和风格
2. 翻译要自然流畅，符合目标语言的表达习惯
3. 字幕内容要简洁，适合阅读
4. 保持原文的分句方式，不要合并或拆分句子
5. 返回格式必须是JSON数组，每个元素对应原文的翻译结果

示例输入：["Hello, how are you?", "I'm fine, thank you."]
示例输出：["你好，你怎么样？", "我很好，谢谢。"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(textsToTranslate) },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API 额度不足，请充值后再试" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No translation content received");
    }

    // Parse the translated content
    let translatedTexts: string[];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        translatedTexts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse translation response:", content);
      throw new Error("Failed to parse translation response");
    }

    // Ensure we have the same number of translations as originals
    if (translatedTexts.length !== subtitles.length) {
      console.warn(`Translation count mismatch: expected ${subtitles.length}, got ${translatedTexts.length}`);
      // Pad or trim to match
      while (translatedTexts.length < subtitles.length) {
        translatedTexts.push(subtitles[translatedTexts.length].text);
      }
      translatedTexts = translatedTexts.slice(0, subtitles.length);
    }

    // Build translated subtitles with original timing
    const translatedSubtitles = subtitles.map((sub: { id: number; startTime: number; endTime: number; text: string }, index: number) => ({
      id: sub.id,
      startTime: sub.startTime,
      endTime: sub.endTime,
      text: sub.text,
      translatedText: translatedTexts[index],
    }));

    return new Response(
      JSON.stringify({ translatedSubtitles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
