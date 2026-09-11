// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntityRegistryForInstallation {
    function isEntityActive(address walletAddress)
        external
        view
        returns (bool);

    function getEntityRole(address walletAddress)
        external
        view
        returns (uint8);
}

interface IEquipmentRegistryForInstallation {
    enum EquipmentState {
        Manufactured,
        Registered,
        InTransit,
        Installed,
        Operational,
        UnderMaintenance,
        Recalled,
        Decommissioned,
        Disposed
    }

    function isEquipmentRegistered(bytes32 equipmentId)
        external
        view
        returns (bool);

    function getCurrentOwner(bytes32 equipmentId)
        external
        view
        returns (address);

    function getEquipmentState(bytes32 equipmentId)
        external
        view
        returns (EquipmentState);

    function updateEquipmentState(
        bytes32 equipmentId,
        EquipmentState newState
    )
        external;
}

contract InstallationCalibrationContract {
    struct InstallationRecord {
        uint256 installationId;
        bytes32 equipmentId;
        address healthcareInstitution;
        address biomedicalEngineer;
        string installationLocation;
        string calibrationCertificate;
        string firmwareVersion;
        bool safetyApproved;
        bool calibrationValid;
        bool firmwareApproved;
        bool operational;
        uint256 installationTime;
    }

    IEntityRegistryForInstallation public entityContract;
    IEquipmentRegistryForInstallation public equipmentContract;

    uint256 private installationCounter;

    mapping(bytes32 => InstallationRecord)
        private installationRecords;

    mapping(bytes32 => bool)
        private installationExists;

    event EquipmentInstalled(
        uint256 indexed installationId,
        bytes32 indexed equipmentId,
        address indexed healthcareInstitution,
        address biomedicalEngineer,
        bool operational,
        uint256 installationTime
    );

    constructor(
        address entityContractAddress,
        address equipmentContractAddress
    ) {
        require(
            entityContractAddress != address(0),
            "Invalid entity contract address."
        );

        require(
            equipmentContractAddress != address(0),
            "Invalid equipment contract address."
        );

        entityContract =
            IEntityRegistryForInstallation(
                entityContractAddress
            );

        equipmentContract =
            IEquipmentRegistryForInstallation(
                equipmentContractAddress
            );
    }

    function installEquipment(
        bytes32 equipmentId,
        address healthcareInstitution,
        string memory installationLocation,
        string memory calibrationCertificate,
        string memory firmwareVersion,
        bool safetyApproved,
        bool calibrationValid,
        bool firmwareApproved
    )
        external
        returns (uint256)
    {
        require(
            equipmentContract
                .isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        require(
            entityContract.isEntityActive(msg.sender),
            "Biomedical Engineer is not active."
        );

        require(
            entityContract.getEntityRole(msg.sender) == 5,
            "Only a Biomedical Engineer can install equipment."
        );

        require(
            entityContract
                .isEntityActive(healthcareInstitution),
            "Healthcare Institution is not active."
        );

        require(
            entityContract
                .getEntityRole(healthcareInstitution) == 4,
            "Invalid Healthcare Institution role."
        );

        require(
            equipmentContract.getCurrentOwner(equipmentId)
                == healthcareInstitution,
            "Healthcare Institution is not the current owner."
        );

        require(
            !installationExists[equipmentId],
            "Equipment is already installed."
        );

        require(
            bytes(installationLocation).length > 0,
            "Installation location is required."
        );

        require(
            bytes(calibrationCertificate).length > 0,
            "Calibration certificate is required."
        );

        require(
            bytes(firmwareVersion).length > 0,
            "Firmware version is required."
        );

        bool operationalStatus =
            safetyApproved &&
            calibrationValid &&
            firmwareApproved;

        require(
            operationalStatus,
            "Installation validation failed."
        );

        /*
         * First move the equipment to Installed state.
         */
        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForInstallation
                .EquipmentState
                .Installed
        );

        /*
         * After all checks succeed, move it to Operational.
         */
        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForInstallation
                .EquipmentState
                .Operational
        );

        installationCounter++;

        installationRecords[equipmentId] =
            InstallationRecord({
                installationId: installationCounter,
                equipmentId: equipmentId,
                healthcareInstitution:
                    healthcareInstitution,
                biomedicalEngineer: msg.sender,
                installationLocation:
                    installationLocation,
                calibrationCertificate:
                    calibrationCertificate,
                firmwareVersion: firmwareVersion,
                safetyApproved: safetyApproved,
                calibrationValid: calibrationValid,
                firmwareApproved: firmwareApproved,
                operational: operationalStatus,
                installationTime: block.timestamp
            });

        installationExists[equipmentId] = true;

        emit EquipmentInstalled(
            installationCounter,
            equipmentId,
            healthcareInstitution,
            msg.sender,
            operationalStatus,
            block.timestamp
        );

        return installationCounter;
    }

    function getInstallationRecord(
        bytes32 equipmentId
    )
        external
        view
        returns (InstallationRecord memory)
    {
        require(
            installationExists[equipmentId],
            "Installation record does not exist."
        );

        return installationRecords[equipmentId];
    }

    function isEquipmentOperational(
        bytes32 equipmentId
    )
        external
        view
        returns (bool)
    {
        return
            installationRecords[equipmentId]
                .operational;
    }

    function getInstallationCount()
        external
        view
        returns (uint256)
    {
        return installationCounter;
    }
}