"use client";
import styles from "./page.module.css";
import DerivAPIBasic from "@deriv/deriv-api/dist/DerivAPIBasic.js";
import { useState, useEffect } from "react";

export default function Home() {
  const [ticks, setTicks] = useState([]); // Estado para armazenar os ticks
  const [connection, setConnection] = useState(null); // Estado para a conexão WebSocket
  const [api, setApi] = useState(null); // Estado para a instância da API

  // Inicializa a conexão WebSocket e a API
  useEffect(() => {
    const conn = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );
    const apiInstance = new DerivAPIBasic({ connection: conn });

    setConnection(conn);
    setApi(apiInstance);

    // Fecha a conexão ao desmontar o componente
    return () => {
      conn.close();
    };
  }, []);

  // Função para lidar com as respostas dos ticks
  const tickResponse = async (res) => {
    const data = JSON.parse(res.data);
    if (data.error !== undefined) {
      console.log("Error : ", data.error.message);
      connection.removeEventListener("message", tickResponse, false);
      await api.disconnect();
    }
    if (data.msg_type === "tick") {
      console.log("Novo tick recebido:", data.tick);
      setTicks((prevTicks) => [...prevTicks, data.tick]); // Adiciona o novo tick ao estado
    }
  };

  // Função para se inscrever nos ticks
  const subscribeTicks = async () => {
    if (api) {
      await api.subscribe({ ticks: "R_100" });
      connection.addEventListener("message", tickResponse);
      console.log("Inscrito nos ticks");
    }
  };

  // Função para cancelar a inscrição nos ticks
  const unsubscribeTicks = () => {
    if (api) {
      connection.removeEventListener("message", tickResponse, false);
      api.subscribe({ ticks: "R_100" }).unsubscribe();
      console.log("Inscrição cancelada");
    }
  };

  return (
    <div className={styles.page}>
      <h1>Trade Platform</h1>
      <div className={styles.buttons}>
        <button onClick={() => subscribeTicks()}>Subscribe</button>
      </div>
      <div className={styles.ticksContainer}>
        <h2>Ticks Recebidos:</h2>
        <ul className={styles.ticksList}>
          {ticks.map((tick, index) => (
            <li key={index} className={styles.tickItem}>
              <span className={styles.tickTime}>
                {new Date(tick.epoch * 1000).toLocaleTimeString()}
              </span>
              <span className={styles.tickPrice}>{tick.quote}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

