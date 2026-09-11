// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntityRegistryForTransfer {
    function isEntityActive(address walletAddress)
        external
        view
        returns (bool);
}

interface IEquipmentRegistryForTransfer {
    function isEquipmentRegistered(bytes32 equipmentId)
        external
        view
        returns (bool);

    function getCurrentOwner(bytes32 equipmentId)
        external
        view
        returns (address);

    function updateCurrentOwner(
        bytes32 equipmentId,
        address newOwner
    )
        external;
}

contract OwnershipShipmentContract {
    struct TransferRecord {
        uint256 transferId;
        bytes32 equipmentId;
        address sender;
        address receiver;
        address transporter;
        string shipmentId;
        string destination;
        uint256 transferTime;
        bool completed;
    }

    IEntityRegistryForTransfer public entityContract;
    IEquipmentRegistryForTransfer public equipmentContract;

    uint256 private transferCounter;

    mapping(uint256 => TransferRecord) private transferRecords;
    mapping(bytes32 => uint256[]) private equipmentTransferIds;

    event EquipmentTransferred(
        uint256 indexed transferId,
        bytes32 indexed equipmentId,
        address indexed sender,
        address receiver,
        address transporter,
        string shipmentId,
        uint256 transferTime
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
            IEntityRegistryForTransfer(entityContractAddress);

        equipmentContract =
            IEquipmentRegistryForTransfer(equipmentContractAddress);
    }

    function transferEquipment(
        bytes32 equipmentId,
        address receiver,
        address transporter,
        string memory shipmentId,
        string memory destination
    )
        external
        returns (uint256)
    {
        require(
            equipmentContract.isEquipmentRegistered(equipmentId),
            "Equipment is not registered."
        );

        require(
            equipmentContract.getCurrentOwner(equipmentId) == msg.sender,
            "Only the current owner can transfer equipment."
        );

        require(
            entityContract.isEntityActive(msg.sender),
            "Sender is not active."
        );

        require(
            entityContract.isEntityActive(receiver),
            "Receiver is not active."
        );

        require(
            entityContract.isEntityActive(transporter),
            "Transporter is not active."
        );

        require(
            receiver != address(0) &&
            transporter != address(0),
            "Invalid receiver or transporter."
        );

        require(
            bytes(shipmentId).length > 0,
            "Shipment ID is required."
        );

        require(
            bytes(destination).length > 0,
            "Destination is required."
        );

        transferCounter++;

        transferRecords[transferCounter] = TransferRecord({
            transferId: transferCounter,
            equipmentId: equipmentId,
            sender: msg.sender,
            receiver: receiver,
            transporter: transporter,
            shipmentId: shipmentId,
            destination: destination,
            transferTime: block.timestamp,
            completed: true
        });

        equipmentTransferIds[equipmentId].push(transferCounter);

        equipmentContract.updateCurrentOwner(
            equipmentId,
            receiver
        );

        emit EquipmentTransferred(
            transferCounter,
            equipmentId,
            msg.sender,
            receiver,
            transporter,
            shipmentId,
            block.timestamp
        );

        return transferCounter;
    }

    function getTransferRecord(uint256 transferId)
        external
        view
        returns (TransferRecord memory)
    {
        require(
            transferId > 0 && transferId <= transferCounter,
            "Invalid transfer ID."
        );

        return transferRecords[transferId];
    }

    function getTransferIdsByEquipment(bytes32 equipmentId)
        external
        view
        returns (uint256[] memory)
    {
        return equipmentTransferIds[equipmentId];
    }

    function getTransferCount()
        external
        view
        returns (uint256)
    {
        return transferCounter;
    }
}