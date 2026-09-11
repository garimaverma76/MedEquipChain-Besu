const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { NonceManager } = require("@ethersproject/experimental");


// ============================================================
// Helper: Fund manufacturer wallet
// ============================================================

async function fundWallet(
    regulatoryAuthority,
    wallet,
    amount = "10"
) {
    const tx = await regulatoryAuthority.sendTransaction({
        to: wallet.address,
        value: hre.ethers.utils.parseEther(amount),
        gasPrice: 0
    });

    await tx.wait();
}


// ============================================================
// Helper: Execute and measure equipment registration
// ============================================================

async function executeRegistration(
    equipmentRegistration,
    manufacturer,
    equipmentNumber,
    manufacturingDate,
    warrantyExpiry
) {

    const equipmentCode =
        `WL-${equipmentNumber}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const startTime = process.hrtime.bigint();

    try {

        const tx =
            await equipmentRegistration
                .connect(manufacturer)
                .registerEquipment(
                    equipmentCode,
                    "Magnetic Resonance Imaging Scanner",
                    "MRI-X500",
                    "Diagnostic Imaging",
                    `CERT-${equipmentCode}`,
                    "FW-1.0.0",
                    manufacturingDate,
                    warrantyExpiry
                );

        // Maximum 30-second wait for confirmation.
        // Normal QBFT confirmation is approximately 4.2 seconds.
        const receipt = await Promise.race([
            tx.wait(),

            new Promise((_, reject) =>
                setTimeout(
                    () => reject(
                        new Error("TRANSACTION_TIMEOUT_30S")
                    ),
                    30000
                )
            )
        ]);

        const endTime =
            process.hrtime.bigint();

        const latencyMs =
            Number(endTime - startTime) /
            1_000_000;

        return {
            equipmentCode,
            success: 1,
            gasUsed:
                Number(receipt.gasUsed.toString()),
            latencyMs,
            blockNumber:
                receipt.blockNumber,
            transactionHash:
                receipt.transactionHash,
            error: ""
        };

    } catch (error) {

        const endTime =
            process.hrtime.bigint();

        const latencyMs =
            Number(endTime - startTime) /
            1_000_000;

        return {
            equipmentCode,
            success: 0,
            gasUsed: 0,
            latencyMs,
            blockNumber: "",
            transactionHash: "",
            error:
                error.message || String(error)
        };
    }
}


// ============================================================
// Main workload benchmark
// ============================================================

async function main() {

    console.log(
        "=========================================="
    );

    console.log(
        " MedEquipChain-LC Workload Benchmark"
    );

    console.log(
        "=========================================="
    );

    const provider =
        hre.ethers.provider;


    // ==========================================================
    // 1. REGULATORY AUTHORITY
    // ==========================================================

    const [baseRegulatoryAuthority] =
        await hre.ethers.getSigners();

    const regulatoryAuthority =
        new NonceManager(
            baseRegulatoryAuthority
        );

    const currentNonce =
        await provider.getTransactionCount(
            baseRegulatoryAuthority.address,
            "pending"
        );

    regulatoryAuthority.setTransactionCount(
        currentNonce
    );

    console.log(
        "Regulatory Authority:",
        baseRegulatoryAuthority.address
    );

    console.log(
        "Starting regulatory authority nonce:",
        currentNonce
    );


    // ==========================================================
    // 2. CREATE MANUFACTURER WALLET
    // ==========================================================

    const baseManufacturer =
        hre.ethers.Wallet
            .createRandom()
            .connect(provider);

    const manufacturer =
        new NonceManager(
            baseManufacturer
        );

    const manufacturerNonce =
        await provider.getTransactionCount(
            baseManufacturer.address,
            "pending"
        );

    manufacturer.setTransactionCount(
        manufacturerNonce
    );

    console.log(
        "Starting manufacturer nonce:",
        manufacturerNonce
    );

    console.log(
        "Workload Manufacturer:",
        baseManufacturer.address
    );


    // ==========================================================
    // 3. FUND MANUFACTURER
    // ==========================================================

    console.log(
        "\nFunding workload manufacturer..."
    );

    await fundWallet(
        regulatoryAuthority,
        baseManufacturer,
        "10"
    );

    const manufacturerBalance =
        await provider.getBalance(
            baseManufacturer.address
        );

    console.log(
        "Manufacturer funded successfully."
    );

    console.log(
        "Manufacturer balance:",
        hre.ethers.utils.formatEther(
            manufacturerBalance
        ),
        "ETH"
    );


    // ==========================================================
    // 4. DEPLOY FRESH CONTRACTS
    // ==========================================================

    console.log(
        "\nDeploying workload benchmark contracts..."
    );

    const EntityEnrollment =
        await hre.ethers.getContractFactory(
            "EntityEnrollmentContract",
            regulatoryAuthority
        );

    const entityEnrollment =
        await EntityEnrollment.deploy();

    await entityEnrollment.deployed();

    console.log(
        "EntityEnrollmentContract:",
        entityEnrollment.address
    );


    const EquipmentRegistration =
        await hre.ethers.getContractFactory(
            "EquipmentRegistrationContract",
            regulatoryAuthority
        );

    const equipmentRegistration =
        await EquipmentRegistration.deploy(
            entityEnrollment.address
        );

    await equipmentRegistration.deployed();

    console.log(
        "EquipmentRegistrationContract:",
        equipmentRegistration.address
    );

    console.log(
        "Workload benchmark contracts deployed successfully."
    );


    // ==========================================================
    // 5. ENROLL MANUFACTURER
    // ==========================================================

    console.log(
        "\nEnrolling workload manufacturer..."
    );

    const enrollTx =
        await entityEnrollment
            .connect(regulatoryAuthority)
            .enrollEntity(
                baseManufacturer.address,
                "Medical Equipment Manufacturer",
                "LIC-WORKLOAD-EM-001",
                1
            );

    const enrollReceipt =
        await enrollTx.wait();

    console.log(
        "Manufacturer enrolled successfully."
    );

    console.log(
        "Enrollment transaction:",
        enrollReceipt.transactionHash
    );

    console.log(
        "Enrollment gas used:",
        enrollReceipt.gasUsed.toString()
    );


    // ==========================================================
    // 6. EQUIPMENT PARAMETERS
    // ==========================================================

    const manufacturingDate =
        Math.floor(Date.now() / 1000) -
        86400;

    const warrantyExpiry =
        manufacturingDate +
        (5 * 365 * 24 * 60 * 60);


    // ==========================================================
    // 7. RESULTS DIRECTORY
    // ==========================================================

    const resultsDir =
        path.join(
            __dirname,
            "..",
            "results",
            "workload"
        );

    if (!fs.existsSync(resultsDir)) {

        fs.mkdirSync(
            resultsDir,
            {
                recursive: true
            }
        );
    }


    // ==========================================================
    // 8. WORKLOAD SIZE
    // ==========================================================

    const workloadSize = 500;

    console.log(
        `\nStarting sequential workload experiment: N = ${workloadSize}`
    );


    // ==========================================================
    // 9. INITIALIZE INCREMENTAL RESULT FILE
    // ==========================================================

    const timestamp =
        Date.now();

    const rawFile =
        path.join(
            resultsDir,
            `workload_N${workloadSize}_raw_${timestamp}.csv`
        );

    const rawCsvHeader =
        "Transaction,EquipmentCode,Success,GasUsed,LatencyMs,BlockNumber,TransactionHash,Error\n";

    fs.writeFileSync(
        rawFile,
        rawCsvHeader
    );

    console.log(
        "Incremental raw results file:"
    );

    console.log(rawFile);


    // ==========================================================
    // 10. EXECUTE SEQUENTIAL WORKLOAD
    // ==========================================================

    const workloadResults = [];

    const workloadStart =
        process.hrtime.bigint();

    for (
        let i = 1;
        i <= workloadSize;
        i++
    ) {

        const result =
            await executeRegistration(
                equipmentRegistration,
                manufacturer,
                10000 + i,
                manufacturingDate,
                warrantyExpiry
            );

        workloadResults.push(
            result
        );


        // ------------------------------------------------------
        // Save this transaction immediately
        // ------------------------------------------------------

        const safeError =
            (result.error || "")
                .replace(/"/g, '""')
                .replace(/\r?\n/g, " ");

        const csvRow =
            [
                i,
                result.equipmentCode,
                result.success,
                result.gasUsed,
                result.latencyMs.toFixed(3),
                result.blockNumber,
                result.transactionHash,
                `"${safeError}"`
            ].join(",") + "\n";

        fs.appendFileSync(
            rawFile,
            csvRow
        );


        // ------------------------------------------------------
        // Console progress
        // ------------------------------------------------------

        if (!result.success) {

            console.log(
                `Transaction ${i} FAILED |`,
                result.error
            );
        }

        if (i % 10 === 0) {

            console.log(
                `Completed ${i}/${workloadSize} transactions`
            );
        }
    }


    const workloadEnd =
        process.hrtime.bigint();

    const totalTimeSec =
        Number(
            workloadEnd -
            workloadStart
        ) /
        1_000_000_000;


    // ==========================================================
    // 11. CALCULATE PERFORMANCE METRICS
    // ==========================================================

    const successful =
        workloadResults.filter(
            r => r.success === 1
        );

    const failed =
        workloadResults.filter(
            r => r.success === 0
        );

    const latencies =
        successful
            .map(
                r => r.latencyMs
            )
            .sort(
                (a, b) => a - b
            );

    let meanLatency = 0;
    let medianLatency = 0;
    let p95Latency = 0;

    if (latencies.length > 0) {

        meanLatency =
            latencies.reduce(
                (a, b) => a + b,
                0
            ) /
            latencies.length;


        if (
            latencies.length % 2 === 0
        ) {

            medianLatency =
                (
                    latencies[
                        latencies.length / 2 - 1
                    ] +
                    latencies[
                        latencies.length / 2
                    ]
                ) /
                2;

        } else {

            medianLatency =
                latencies[
                    Math.floor(
                        latencies.length / 2
                    )
                ];
        }


        const p95Index =
            Math.ceil(
                0.95 *
                latencies.length
            ) - 1;

        p95Latency =
            latencies[p95Index];
    }


    const throughput =
        successful.length /
        totalTimeSec;

    const successRate =
        (
            successful.length /
            workloadSize
        ) *
        100;


    // ==========================================================
    // 12. DISPLAY RESULTS
    // ==========================================================

    console.log(
        `\n========== WORKLOAD N=${workloadSize} RESULTS ==========`
    );

    console.log(
        "Successful:",
        successful.length
    );

    console.log(
        "Failed:",
        failed.length
    );

    console.log(
        "Success Rate (%):",
        successRate.toFixed(2)
    );

    console.log(
        "Total Time (s):",
        totalTimeSec.toFixed(3)
    );

    console.log(
        "Throughput (TPS):",
        throughput.toFixed(4)
    );

    console.log(
        "Mean Latency (ms):",
        meanLatency.toFixed(3)
    );

    console.log(
        "Median Latency (ms):",
        medianLatency.toFixed(3)
    );

    console.log(
        "P95 Latency (ms):",
        p95Latency.toFixed(3)
    );


    // ==========================================================
    // 13. SAVE SUMMARY
    // ==========================================================

    const summaryCsv =
        "Workload,SuccessfulTx,FailedTx,SuccessRate,TotalTimeSec,ThroughputTPS,MeanLatencyMs,MedianLatencyMs,P95LatencyMs\n" +
        [
            workloadSize,
            successful.length,
            failed.length,
            successRate.toFixed(2),
            totalTimeSec.toFixed(3),
            throughput.toFixed(4),
            meanLatency.toFixed(3),
            medianLatency.toFixed(3),
            p95Latency.toFixed(3)
        ].join(",");

    const summaryFile =
        path.join(
            resultsDir,
            `workload_N${workloadSize}_summary_${timestamp}.csv`
        );

    fs.writeFileSync(
        summaryFile,
        summaryCsv
    );


    // ==========================================================
    // 14. FINAL INFORMATION
    // ==========================================================

    console.log(
        "\nRaw results saved incrementally to:"
    );

    console.log(
        rawFile
    );

    console.log(
        "\nSummary saved to:"
    );

    console.log(
        summaryFile
    );


    const network =
        await provider.getNetwork();

    const blockNumber =
        await provider.getBlockNumber();

    console.log(
        "\nBesu QBFT Network Information"
    );

    console.log(
        "Chain ID:",
        network.chainId
    );

    console.log(
        "Final Block Number:",
        blockNumber
    );

    console.log(
        "Results directory:",
        resultsDir
    );

    console.log(
        "\nWorkload benchmark completed successfully."
    );
}


main()
    .then(
        () => process.exit(0)
    )
    .catch(
        (error) => {

            console.error(
                "Workload benchmark failed:"
            );

            console.error(
                error
            );

            process.exit(1);
        }
    );