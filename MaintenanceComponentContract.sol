// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntityRegistryForMaintenance {
    function isEntityActive(address walletAddress)
        external
        view
        returns (bool);

    function getEntityRole(address walletAddress)
        external
        view
        returns (uint8);
}

interface IEquipmentRegistryForMaintenance {
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

    function isEquipmentOperational(bytes32 equipmentId)
        external
        view
        returns (bool);

    function updateEquipmentState(
        bytes32 equipmentId,
        EquipmentState newState
    )
        external;
}

contract MaintenanceComponentContract {
    struct MaintenanceRecord {
        uint256 maintenanceId;
        bytes32 equipmentId;
        address serviceProvider;
        string maintenanceType;
        string faultDetails;
        string componentId;
        string calibrationCertificate;
        bool componentVerified;
        bool calibrationValid;
        uint256 maintenanceTime;
    }

    IEntityRegistryForMaintenance public entityContract;
    IEquipmentRegistryForMaintenance public equipmentContract;

    uint256 private maintenanceCounter;

    mapping(uint256 => MaintenanceRecord) private maintenanceRecords;
    mapping(bytes32 => uint256[]) private equipmentMaintenanceIds;

    event MaintenanceStarted(
        uint256 indexed maintenanceId,
        bytes32 indexed equipmentId,
        address indexed serviceProvider,
        uint256 timestamp
    );

    event MaintenanceCompleted(
        uint256 indexed maintenanceId,
        bytes32 indexed equipmentId,
        bool componentVerified,
        bool calibrationValid,
        uint256 timestamp
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
            IEntityRegistryForMaintenance(entityContractAddress);

        equipmentContract =
            IEquipmentRegistryForMaintenance(equipmentContractAddress);
    }

    modifier onlyAuthorizedMaintenanceProvider() {
        require(
            entityContract.isEntityActive(msg.sender),
            "Maintenance provider is not active."
        );

        uint8 role = entityContract.getEntityRole(msg.sender);

        require(
            role == 5 || role == 6,
            "Only BE or MSP can perform maintenance."
        );

        _;
    }

    function maintainEquipment(
        bytes32 equipmentId,
        string memory maintenanceType,
        string memory faultDetails,
        string memory componentId,
        string memory calibrationCertificate,
        bool componentVerified,
        bool calibrationValid
    )
        external
        onlyAuthorizedMaintenanceProvider
        returns (uint256)
    {
        require(
            equipmentContract.isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        require(
            equipmentContract.isEquipmentOperational(equipmentId),
            "Equipment is not operational."
        );

        require(
            bytes(maintenanceType).length > 0,
            "Maintenance type is required."
        );

        require(
            bytes(calibrationCertificate).length > 0,
            "Calibration certificate is required."
        );

        require(
            componentVerified,
            "Replacement component is not verified."
        );

        require(
            calibrationValid,
            "Calibration validation failed."
        );

        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForMaintenance
                .EquipmentState
                .UnderMaintenance
        );

        maintenanceCounter++;

        maintenanceRecords[maintenanceCounter] = MaintenanceRecord({
            maintenanceId: maintenanceCounter,
            equipmentId: equipmentId,
            serviceProvider: msg.sender,
            maintenanceType: maintenanceType,
            faultDetails: faultDetails,
            componentId: componentId,
            calibrationCertificate: calibrationCertificate,
            componentVerified: componentVerified,
            calibrationValid: calibrationValid,
            maintenanceTime: block.timestamp
        });

        equipmentMaintenanceIds[equipmentId].push(
            maintenanceCounter
        );

        emit MaintenanceStarted(
            maintenanceCounter,
            equipmentId,
            msg.sender,
            block.timestamp
        );

        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForMaintenance
                .EquipmentState
                .Operational
        );

        emit MaintenanceCompleted(
            maintenanceCounter,
            equipmentId,
            componentVerified,
            calibrationValid,
            block.timestamp
        );

        return maintenanceCounter;
    }

    function getMaintenanceRecord(uint256 maintenanceId)
        external
        view
        returns (MaintenanceRecord memory)
    {
        require(
            maintenanceId > 0 &&
            maintenanceId <= maintenanceCounter,
            "Invalid maintenance ID."
        );

        return maintenanceRecords[maintenanceId];
    }

    function getMaintenanceIdsByEquipment(
        bytes32 equipmentId
    )
        external
        view
        returns (uint256[] memory)
    {
        return equipmentMaintenanceIds[equipmentId];
    }

    function getMaintenanceCount()
        external
        view
        returns (uint256)
    {
        return maintenanceCounter;
    }
}