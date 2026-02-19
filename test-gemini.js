const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcoded key for testing purposes to bypass dotenv issues
const key = "AIzaSyCCkNV8_5FFGGJqoupfdg-pYjF7ilqeuNM";
const genAI = new GoogleGenerativeAI(key);

const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function testConnection() {
    console.log("🤖 Starting Gemini Connectivity Test...\n");

    for (const modelName of modelsToTest) {
        process.stdout.write(`Testing [${modelName}]... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello. Reply with 'OK'.");
            const response = await result.response;
            const text = response.text();

            console.log(`✅ SUCCESS!`);
            console.log(`   Response: "${text.trim()}"`);
            console.log(`\n🎉 RECOMMENDED MODEL: "${modelName}"`);
            return; // Exit on first success
        } catch (error) {
            console.log(`❌ FAILED`);
            // Only print the first line of error to keep it clean
            const msg = error.message ? error.message.split('\n')[0] : "Unknown error";
            console.log(`   Error: ${msg}`);
            if (error.message && error.message.includes("404")) {
                console.log(`   (Model not found or not supported in this region/version)`);
            }
        }
    }
    console.log("\n❌ All models failed test.");
}

testConnection();
