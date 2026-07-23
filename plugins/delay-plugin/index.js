const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function execute(ctx) {
    const { job } = ctx;

    console.log("Plugin executing:", job.id);

    await sleep(job.payload.duration);

    if (Math.random() < 0.3) {
        throw new Error("Random failure");
    }

    return {
        message: "Completed",
        completedAt: new Date().toISOString()
    };
}