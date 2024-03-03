import styles from './DeveloperPane.module.css';

export const DeveloperPane = () => {
    return (
        <div className={styles.main}>
            <button
                className={styles.btn}
                style={{ backgroundColor: 'red' }}
                onClick={() => window['stop']()}
            />
            <button
                className={styles.btn}
                style={{ backgroundColor: 'green' }}
                onClick={() => window['play']()}
            />
            <button
                className={styles.btn}
                style={{ backgroundColor: 'blue' }}
                onClick={() => window['next']()}
            />
        </div>
    );
};