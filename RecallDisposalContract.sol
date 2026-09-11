// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntityRegistryForRecall {
    function isEntityActive(address walletAddress)
        external
        view
        returns (bool);

    function getEntityRole(address walletAddress)
        external
        view
        returns (uint8);

    function regulatoryAuthority()
        external
        view
        returns (address);
}

interface IEquipmentRegistryForRecall {
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

contract RecallDisposalContract {
    struct RecallRecord {
        uint256 recallId;
        bytes32 equipmentId;
        address initiatedBy;
        string recallReason;
        uint256 recallTime;
        bool active;
    }

    struct DisposalRecord {
        uint256 disposalId;
        bytes32 equipmentId;
        address disposalAgency;
        string disposalMethod;
        string disposalCertificate;
        uint256 disposalTime;
    }

    IEntityRegistryForRecall public entityContract;
    IEquipmentRegistryForRecall public equipmentContract;

    uint256 private recallCounter;
    uint256 private disposalCounter;

    mapping(bytes32 => RecallRecord) private recallRecords;
    mapping(bytes32 => DisposalRecord) private disposalRecords;

    event EquipmentRecalled(
        uint256 indexed recallId,
        bytes32 indexed equipmentId,
        address indexed initiatedBy,
        string recallReason,
        uint256 recallTime
    );

    event EquipmentDecommissioned(
        bytes32 indexed equipmentId,
        address indexed initiatedBy,
        uint256 timestamp
    );

    event EquipmentDisposed(
        uint256 indexed disposalId,
        bytes32 indexed equipmentId,
        address indexed disposalAgency,
        string disposalCertificate,
        uint256 disposalTime
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
            IEntityRegistryForRecall(entityContractAddress);

        equipmentContract =
            IEquipmentRegistryForRecall(equipmentContractAddress);
    }

    modifier onlyRecallAuthority() {
        bool isRegulatoryAuthority =
            msg.sender == entityContract.regulatoryAuthority();

        bool isManufacturer =
            entityContract.isEntityActive(msg.sender) &&
            entityContract.getEntityRole(msg.sender) == 1;

        require(
            isRegulatoryAuthority || isManufacturer,
            "Only RA or manufacturer can recall equipment."
        );

        _;
    }

    modifier onlyDisposalAgency() {
        require(
            entityContract.isEntityActive(msg.sender),
            "Disposal agency is not active."
        );

        require(
            entityContract.getEntityRole(msg.sender) == 8,
            "Only a Disposal and Recycling Agency can dispose equipment."
        );

        _;
    }

    function recallEquipment(
        bytes32 equipmentId,
        string memory recallReason
    )
        external
        onlyRecallAuthority
        returns (uint256)
    {
        require(
            equipmentContract.isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        require(
            bytes(recallReason).length > 0,
            "Recall reason is required."
        );

        IEquipmentRegistryForRecall.EquipmentState currentState =
            equipmentContract.getEquipmentState(equipmentId);

        require(
            currentState ==
                IEquipmentRegistryForRecall.EquipmentState.Operational ||
            currentState ==
                IEquipmentRegistryForRecall
                    .EquipmentState
                    .UnderMaintenance,
            "Equipment cannot be recalled from its current state."
        );

        require(
            !recallRecords[equipmentId].active,
            "Equipment is already recalled."
        );

        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForRecall.EquipmentState.Recalled
        );

        recallCounter++;

        recallRecords[equipmentId] = RecallRecord({
            recallId: recallCounter,
            equipmentId: equipmentId,
            initiatedBy: msg.sender,
            recallReason: recallReason,
            recallTime: block.timestamp,
            active: true
        });

        emit EquipmentRecalled(
            recallCounter,
            equipmentId,
            msg.sender,
            recallReason,
            block.timestamp
        );

        return recallCounter;
    }

    function decommissionEquipment(bytes32 equipmentId)
        external
        onlyRecallAuthority
    {
        require(
            equipmentContract.isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        IEquipmentRegistryForRecall.EquipmentState currentState =
            equipmentContract.getEquipmentState(equipmentId);

        require(
            currentState ==
                IEquipmentRegistryForRecall.EquipmentState.Recalled ||
            currentState ==
                IEquipmentRegistryForRecall
                    .EquipmentState
                    .Operational ||
            currentState ==
                IEquipmentRegistryForRecall
                    .EquipmentState
                    .UnderMaintenance,
            "Equipment cannot be decommissioned from its current state."
        );

        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForRecall
                .EquipmentState
                .Decommissioned
        );

        emit EquipmentDecommissioned(
            equipmentId,
            msg.sender,
            block.timestamp
        );
    }

    function disposeEquipment(
        bytes32 equipmentId,
        string memory disposalMethod,
        string memory disposalCertificate
    )
        external
        onlyDisposalAgency
        returns (uint256)
    {
        require(
            equipmentContract.isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        require(
            bytes(disposalMethod).length > 0,
            "Disposal method is required."
        );

        require(
            bytes(disposalCertificate).length > 0,
            "Disposal certificate is required."
        );

        require(
            equipmentContract.getEquipmentState(equipmentId) ==
                IEquipmentRegistryForRecall
                    .EquipmentState
                    .Decommissioned,
            "Equipment must be decommissioned before disposal."
        );

        require(
            disposalRecords[equipmentId].disposalTime == 0,
            "Equipment is already disposed."
        );

        equipmentContract.updateEquipmentState(
            equipmentId,
            IEquipmentRegistryForRecall.EquipmentState.Disposed
        );

        disposalCounter++;

        disposalRecords[equipmentId] = DisposalRecord({
            disposalId: disposalCounter,
            equipmentId: equipmentId,
            disposalAgency: msg.sender,
            disposalMethod: disposalMethod,
            disposalCertificate: disposalCertificate,
            disposalTime: block.timestamp
        });

        emit EquipmentDisposed(
            disposalCounter,
            equipmentId,
            msg.sender,
            disposalCertificate,
            block.timestamp
        );

        return disposalCounter;
    }

    function getRecallRecord(bytes32 equipmentId)
        external
        view
        returns (RecallRecord memory)
    {
        require(
            recallRecords[equipmentId].recallId != 0,
            "Recall record does not exist."
        );

        return recallRecords[equipmentId];
    }

    function getDisposalRecord(bytes32 equipmentId)
        external
        view
        returns (DisposalRecord memory)
    {
        require(
            disposalRecords[equipmentId].disposalId != 0,
            "Disposal record does not exist."
        );

        return disposalRecords[equipmentId];
    }

    function getRecallCount()
        external
        view
        returns (uint256)
    {
        return recallCounter;
    }

    function getDisposalCount()
        external
        view
        returns (uint256)
    {
        return disposalCounter;
    }
}