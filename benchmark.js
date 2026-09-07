const { performance } = require("node:perf_hooks");

// ============================================
// CONFIGURATION
// ============================================

const SERVICES = [
    {
        name: "Render",
        url: "https://carbon-intensity-dkrd.onrender.com/api/carbon-intensity"
    },
    {
        name: "Cloud Run",
        url: "https://carbon-intensity-56706333580.europe-west1.run.app/api/carbon-intensity"
    }
];

const REQUESTS = 100;
const DELAY_MS = 250;

// ============================================
// HELPERS
// ============================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function percentile(sortedValues, percentile) {
    if (sortedValues.length === 0) {
        return null;
    }

    const index = Math.ceil(
        (percentile / 100) * sortedValues.length
    ) - 1;

    return sortedValues[Math.max(0, index)];
}

function calculateResults(latencies, totalRequests, failures) {
    const sorted = [...latencies].sort((a, b) => a - b);

    return {
        min: sorted[0] ?? null,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted[sorted.length - 1] ?? null,
        successRate: ((latencies.length / totalRequests) * 100),
        successfulRequests: latencies.length,
        failedRequests: failures.length
    };
}

// ============================================
// BENCHMARK
// ============================================

async function benchmarkService(service) {
    console.log("\n========================================");
    console.log(`Testing: ${service.name}`);
    console.log(`URL: ${service.url}`);
    console.log("========================================\n");

    const latencies = [];
    const failures = [];

    for (let i = 0; i < REQUESTS; i++) {
        const start = performance.now();

        try {
            const response = await fetch(service.url);

            const end = performance.now();
            const duration = end - start;

            if (!response.ok) {
                failures.push({
                    request: i + 1,
                    status: response.status,
                    duration
                });

                console.log(
                    `❌ Request ${i + 1}: HTTP ${response.status} (${duration.toFixed(2)}ms)`
                );
            } else {
                latencies.push(duration);

                console.log(
                    `✓ Request ${i + 1}: ${duration.toFixed(2)}ms`
                );
            }

        } catch (error) {
            const end = performance.now();
            const duration = end - start;

            failures.push({
                request: i + 1,
                error: error.message,
                duration
            });

            console.log(
                `❌ Request ${i + 1}: FAILED (${error.message})`
            );
        }

        if (i < REQUESTS - 1) {
            await sleep(DELAY_MS);
        }
    }

    return {
        name: service.name,
        results: calculateResults(
            latencies,
            REQUESTS,
            failures
        ),
        failures
    };
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log("Starting benchmark...");
    console.log(`Requests per service: ${REQUESTS}`);
    console.log(`Delay between requests: ${DELAY_MS}ms`);

    const allResults = [];

    for (const service of SERVICES) {
        const result = await benchmarkService(service);
        allResults.push(result);
    }

    console.log("\n\n========================================");
    console.log("FINAL RESULTS");
    console.log("========================================\n");

    console.table(
        allResults.map(({ name, results }) => ({
            Service: name,
            "Min (ms)": results.min?.toFixed(2),
            "P50 (ms)": results.p50?.toFixed(2),
            "P95 (ms)": results.p95?.toFixed(2),
            "P99 (ms)": results.p99?.toFixed(2),
            "Max (ms)": results.max?.toFixed(2),
            "Success Rate": `${results.successRate.toFixed(2)}%`,
            Successful: results.successfulRequests,
            Failed: results.failedRequests
        }))
    );
}

main().catch(error => {
    console.error("Benchmark failed:", error);
    process.exit(1);
});