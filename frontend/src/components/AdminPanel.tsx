"use client";

import { useState, useEffect } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { UniversityCoreABI, StudentRegistryABI } from "@/abi/UniversityCoreABI";
import { UNIVERSITY_CORE_ADDRESS_ANVIL, STUDENT_REGISTRY_ADDRESS_ANVIL } from "@/constants/contracts";

export function AdminPanel() {
  const { isConnected, chainId } = useAccount();

  // State-uri pentru formulare
  const [studentAddr, setStudentAddr] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  // Hook pentru scriere (Înmatriculare)
  const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();

  // Hook pentru citire (Verificare dacă studentul există deja)
  // Folosim query.enabled pentru a preveni erorile când input-ul este gol
  const { data: studentData, refetch: checkStudent } = useReadContract({
    address: STUDENT_REGISTRY_ADDRESS_ANVIL as `0x${string}`,
    abi: StudentRegistryABI,
    functionName: 'getStudentMetadata',
    args: isAddress(studentAddr) ? [getAddress(studentAddr)] : undefined,
    query: {
      enabled: isAddress(studentAddr),
    }
  });

  // Funcția principală de trimitere a tranzacției
  const handleEnroll = () => {
    if (!isConnected) {
      alert("Te rugăm să conectezi portofelul mai întâi!");
      return;
    }

    if (!isAddress(studentAddr)) {
      alert("Te rugăm să introduci o adresă Ethereum validă (0x...).");
      return;
    }

    if (!registrationNumber.trim()) {
      alert("Te rugăm să introduci numărul de înregistrare.");
      return;
    }

    console.log("--- Execuție Înmatriculare ---");

    writeContract({
      address: UNIVERSITY_CORE_ADDRESS_ANVIL as `0x${string}`,
      abi: UniversityCoreABI,
      functionName: "enrollStudent",
      args: [getAddress(studentAddr), registrationNumber],
    }, {
      onSuccess: (hash) => {
        console.log("Tranzacție trimisă cu succes! Hash:", hash);
        // Așteptăm 2 secunde pentru confirmarea pe blockchain apoi verificăm datele
        setTimeout(() => checkStudent(), 2000);
      },
      onError: (err) => {
        console.error("Eroare la înmatriculare:", err);
      }
    });
  };

  // Monitorizăm datele primite din Blockchain
  useEffect(() => {
    if (studentData) {
      console.log("Date student găsite în Blockchain:", studentData);
    }
  }, [studentData]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Admin: Înmatriculare</h2>

      <div className="flex flex-col gap-4">
        {/* Status Conexiune */}
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
          Network ID: <span className="font-mono text-blue-600">{chainId || "Deconectat"}</span>
        </div>

        {/* Câmp Adresă Student */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Adresă Wallet Student</label>
          <input
            placeholder="0x..."
            className={`border p-2 rounded text-sm font-mono ${studentAddr && !isAddress(studentAddr) ? 'border-red-500' : 'border-gray-300'}`}
            value={studentAddr}
            onChange={(e) => setStudentAddr(e.target.value)}
          />
        </div>

        {/* Câmp Număr Înregistrare */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">Număr Matricol / ID</label>
          <input
            placeholder="Ex: RO-2026-001"
            className="border border-gray-300 p-2 rounded text-sm"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
          />
        </div>

        {/* Mesaj dacă studentul este deja în sistem */}
        {studentData && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs italic">
            Atenție: Această adresă apare deja ca fiind înmatriculată.
          </div>
        )}

        {/* Buton Acțiune */}
        <button
          onClick={handleEnroll}
          disabled={isPending || (studentData ? true : false)}
          className={`py-2 rounded font-semibold transition text-white ${isPending ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
        >
          {isPending ? "Se procesează..." : "Înmatriculează Student"}
        </button>

        {/* Feedback Succes/Eroare */}
        {isSuccess && (
          <p className="text-green-600 text-sm mt-2 font-medium text-center bg-green-50 py-1 rounded">
            ✅ Student înmatriculat cu succes!
          </p>
        )}

        {writeError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded">
            <p className="text-red-600 text-[10px] font-mono break-words">
              {writeError.message.includes("Unauthorized")
                ? "Eroare: Nu ai drepturi de ADMIN pe acest cont!"
                : `Eroare: ${writeError.name}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}