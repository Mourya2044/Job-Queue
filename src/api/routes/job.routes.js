import { Router } from "express";
import { createJob, deleteJobById, getJobById } from "../services/job.services.js";

const router = Router();

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateJobId = (req, res, next) => {
    const { id } = req.params;

    if (!UUID_V4_PATTERN.test(id)) {
        return res.status(400).send({ message: "Invalid job id format" });
    }

    next();
};

router.post("/jobs", async (req, res) => {
    try {
        const { type, payload } = req.body;
        const job = await createJob(type, payload);
        res.status(201).send(job);
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).send({ message: "Error creating job" });
    }
});

router.get("/jobs/:id", validateJobId, async (req, res) => {
    try {
        const job = await getJobById(req.params.id);
        if (job) {
            res.status(200).send(job);
        } else {
            res.status(404).send({ message: "Job not found" });
        }
    } catch (error) {
        console.error("Error retrieving job:", error);
        res.status(500).send({ message: "Error retrieving job" });
    }
});

router.get("/jobs/:id/status", validateJobId, async (req, res) => {
    try {
        const job = await getJobById(req.params.id);
        if (job) {
            res.status(200).send({ status: job.status });
        } else {
            res.status(404).send({ message: "Job not found" });
        }
    } catch (error) {
        console.error("Error retrieving job status:", error);
        res.status(500).send({ message: "Error retrieving job status" });
    }
});

router.delete("/jobs/:id", validateJobId, async (req, res) => {
    try {
        const result = await deleteJobById(req.params.id);
        if (result.deleted) {
            res.status(200).send({ message: "Job deleted", job: result.job });
        } else if (result.message === "RUNNING") {
            res.status(400).send({ message: "Cannot delete a RUNNING job" });
        } else {
            res.status(404).send({ message: "Job not found" });
        }
    } catch (error) {
        console.error("Error deleting job:", error);
        res.status(500).send({ message: "Error deleting job" });
    }
});

export default router;