import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from 'grommet';
import * as styles from './styles.styl';
import { Form, Input, isRequired, MobxForm, NumberInput } from 'components/Form';
import { observer, useObserver } from 'mobx-react-lite';
import { useStores } from 'stores';
import { Button, Icon, Text } from 'components/Base';
import { formatWithSixDecimals, moreThanZero, unlockToken } from 'utils';
import { Spinner } from 'ui/Spinner';
import { EXCHANGE_STEPS } from '../../stores/Exchange';
import { Details } from './Details';
import { AuthWarning } from '../../components/AuthWarning';
import { Steps } from './Steps';
import { EXCHANGE_MODE, TOKEN } from 'stores/interfaces';
import cn from 'classnames';
import { ERC20Select } from './ERC20Select';
import { secretTokenName } from '../../blockchain-bridge';

export interface ITokenInfo {
  label: string;
  maxAmount: string;
  minAmount: string;
}

function getLabel(mode: EXCHANGE_MODE, tokenType: TOKEN, tokenInfo: ITokenInfo) {
  if (tokenInfo.label === 'WSCRT') {
    return mode === EXCHANGE_MODE.SCRT_TO_ETH ? `SSCRT Amount` : `WSCRT Amount`;
  } else {
    return `${secretTokenName(mode, tokenType, tokenInfo.label)} Amount`;
  }
}

export const Exchange = observer((props: any) => {
  const { routing, user, exchange, actionModals, userMetamask } = useStores();

  const [tokenInfo, setTokenInfo] = useState<ITokenInfo>({ label: '', maxAmount: '', minAmount: '' });

  let formRef: MobxForm;

  useEffect(() => {
    if (exchange.token && exchange.mode) {
      if (formRef) {
        formRef.resetTouched();
        formRef.resetErrors();
      }
    }
  }, []);

  const onClickHandler = async (needValidate: boolean, callback: () => void) => {
    //const { actionModals, user, userMetamask, exchange } = props;

    if (!user.isAuthorized) {
      if (exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH) {
        if (!user.isKeplrWallet) {
          return actionModals.open(() => <AuthWarning />, {
            title: '',
            applyText: 'Got it',
            closeText: '',
            noValidation: true,
            width: '500px',
            showOther: true,
            onApply: () => {
              return Promise.resolve();
            },
          });
        } else {
          await user.signIn();
        }
      }
    }

    if (!userMetamask.isAuthorized && exchange.mode === EXCHANGE_MODE.ETH_TO_SCRT) {
      if (!userMetamask.isAuthorized) {
        await userMetamask.signIn(true);
      }
    }

    if (needValidate) {
      formRef.validateFields().then(() => {
        callback();
      });
    } else {
      callback();
    }
  };

  const getTokenInfo = (): ITokenInfo => {
    switch (exchange.token) {
      case TOKEN.ERC20:
        if (!userMetamask.erc20TokenDetails) {
          return { label: '', maxAmount: '0', minAmount: '0' };
        }

        return {
          label: userMetamask.erc20TokenDetails.symbol,
          maxAmount:
            exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH
              ? !user.snip20Balance || user.snip20Balance.includes(unlockToken)
                ? '0'
                : user.snip20Balance
              : userMetamask.erc20Balance,
          minAmount:
            exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH
              ? user.snip20BalanceMin || '0'
              : userMetamask.erc20BalanceMin || '0',
        };

      default:
        if (exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH) {
          return {
            label: 'secretETH',
            maxAmount:
              !user.balanceToken['Ethereum'] || user.balanceToken['Ethereum'].includes(unlockToken)
                ? '0'
                : user.balanceToken['Ethereum'],
            minAmount: user.balanceTokenMin['Ethereum'] || '0',
          };
        } else {
          return {
            label: 'ETH',
            maxAmount: userMetamask.ethBalance,
            minAmount: userMetamask.ethBalanceMin || '0',
          };
        }
    }
  };

  useEffect(() => {
    const result = getTokenInfo();
    setTokenInfo(result);
  }, [
    userMetamask.erc20Address,
    user.snip20Balance,
    user.snip20BalanceMin,
    userMetamask.ethBalance,
    exchange.mode,
    exchange.token,
  ]);

  let icon = () => <Icon style={{ width: 50 }} glyph="RightArrow" />;
  let description = 'Approval';

  switch (exchange.actionStatus) {
    case 'fetching':
      icon = () => <Spinner />;
      description = '';
      break;

    case 'error':
      icon = () => <Icon size="50" style={{ width: 50 }} glyph="Alert" />;
      description = exchange.error;
      break;

    case 'success':
      icon = () => (
        <Box
          style={{
            background: '#1edb89',
            borderRadius: '50%',
          }}
        >
          <Icon size="50" style={{ width: 50, color: 'white' }} glyph="CheckMark" />
        </Box>
      );
      description = 'Success';
      break;
  }

  const Status = () => (
    <Box
      direction="column"
      align="center"
      justify="center"
      fill={true}
      pad="medium"
      style={{ background: '#dedede40' }}
    >
      {icon()}
      <Box
        className={styles.description}
        margin={{ top: 'medium' }}
        pad={{ horizontal: 'small' }}
        style={{ width: '100%' }}
      >
        <Text style={{ textAlign: 'center' }}>{description}</Text>
        <Box margin={{ top: 'medium' }} style={{ width: '100%' }}>
          <Steps />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box direction="column" pad="xlarge" className={styles.exchangeContainer}>
      {exchange.step.id === EXCHANGE_STEPS.BASE ? (
        <Box direction="row">
          <Box
            className={cn(styles.itemToken, exchange.token === TOKEN.ETH ? styles.selected : '')}
            onClick={() => {
              exchange.setToken(TOKEN.ETH);
              routing.push(`/${exchange.token}`);
            }}
          >
            <img
              className={styles.imgToken}
              src={exchange.mode === EXCHANGE_MODE.ETH_TO_SCRT ? '/static/eth.svg' : '/static/scrt.svg'}
            />
            <Text>{exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH ? 'secretETH' : 'ETH'}</Text>
          </Box>

          <Box
            className={cn(styles.itemToken, exchange.token === TOKEN.ERC20 ? styles.selected : '')}
            onClick={() => {
              exchange.setToken(TOKEN.ERC20);
              routing.push(`/${exchange.token}`);
            }}
          >
            <img
              className={styles.imgToken}
              src={exchange.mode === EXCHANGE_MODE.ETH_TO_SCRT ? '/static/eth.svg' : '/static/scrt.svg'}
            />
            <Text>{exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH ? 'SNIP20' : 'ERC20'}</Text>
          </Box>
        </Box>
      ) : null}

      <Form ref={ref => (formRef = ref)} data={exchange.transaction} {...({} as any)}>
        {exchange.step.id === EXCHANGE_STEPS.BASE ? (
          <Box direction="column" fill={true}>
            {exchange.token === TOKEN.ERC20 ? <ERC20Select /> : null}

            <Box direction="column" gap="2px" fill={true} margin={{ top: 'xlarge', bottom: 'large' }}>
              <NumberInput
                label={getLabel(exchange.mode, exchange.token, tokenInfo)}
                name="amount"
                type="decimal"
                precision="6"
                delimiter="."
                placeholder="0"
                style={{ width: '100%' }}
                rules={[
                  isRequired,
                  moreThanZero,
                  (_, value, callback) => {
                    const errors = [];
                    console.log('hello');
                    console.log(getTokenInfo());

                    if (value && Number(value) > Number(getTokenInfo().maxAmount.replace(/,/g, ''))) {
                      errors.push('Exceeded the maximum amount');
                    } else if (value && Number(value) < Number(getTokenInfo().minAmount.replace(/,/g, ''))) {
                      errors.push('Below the minimum amount');
                    }

                    callback(errors);
                  },
                ]}
              />
              <Text size="small" style={{ textAlign: 'right' }}>
                <b>Min / Max</b> = {formatWithSixDecimals(tokenInfo.minAmount.replace(/,/g, ''))}
                {' / '}
                {formatWithSixDecimals(tokenInfo.maxAmount.replace(/,/g, ''))}{' '}
                {secretTokenName(exchange.mode, exchange.token, tokenInfo.label)}
              </Text>
            </Box>

            {exchange.mode === EXCHANGE_MODE.SCRT_TO_ETH ? (
              <Box direction="column" fill={true}>
                <Input
                  label="Destination ETH Address"
                  name="ethAddress"
                  style={{ width: '100%' }}
                  placeholder="Receiver address"
                  rules={[isRequired /* isEthAddress */]}
                />
                {userMetamask.isAuthorized ? (
                  <Box
                    fill={true}
                    style={{
                      color: 'rgb(0, 173, 232)',
                      textAlign: 'right',
                    }}
                    onClick={() => (exchange.transaction.ethAddress = userMetamask.ethAddress)}
                  >
                    Use my address
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Box direction="column" fill={true}>
                <Input
                  label="Destination Secret Address"
                  name="scrtAddress"
                  style={{ width: '100%' }}
                  placeholder="Receiver address"
                  rules={[isRequired /* isSecretAddress */]}
                />
                {user.isAuthorized ? (
                  <Box
                    fill={true}
                    style={{
                      color: 'rgb(0, 173, 232)',
                      textAlign: 'right',
                    }}
                    onClick={() => (exchange.transaction.scrtAddress = user.address)}
                  >
                    Use my address
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
        ) : null}
      </Form>

      {exchange.step.id === EXCHANGE_STEPS.CONFIRMATION ? <Details showTotal={true} /> : null}

      {exchange.step.id === EXCHANGE_STEPS.SENDING ? (
        <Details>
          <Status />
        </Details>
      ) : null}

      {exchange.step.id === EXCHANGE_STEPS.RESULT ? (
        <Details>
          <Status />
        </Details>
      ) : null}

      {exchange.step.id === EXCHANGE_STEPS.CONFIRMATION ? (
        <>
          <Box
            direction="row"
            // justify="end"
            margin={{
              top: exchange.mode === EXCHANGE_MODE.ETH_TO_SCRT ? 'medium' : '0px',
            }}
            fill={true}
          >
            {exchange.mode === EXCHANGE_MODE.ETH_TO_SCRT && exchange.token === TOKEN.ERC20 ? (
              <Text color="Red500" style={{ textAlign: 'left' }}>
                If this is the first time you're sending this token, you will be prompted to sign <b>two</b>{' '}
                transactions.
                <br />
                Otherwise you will be prompted to sign <b>one</b> transaction.
              </Text>
            ) : (
              <Text color="Red500" style={{ textAlign: 'left' }}>
                You will be prompted to sign <b>one</b> transaction
              </Text>
            )}
          </Box>
        </>
      ) : null}

      <Box direction="row" margin={{ top: 'large' }} justify="end" align="center">
        {exchange.step.buttons.map((conf, idx) => (
          <Button
            key={idx}
            bgColor="#00ADE8"
            style={{ width: conf.transparent ? 140 : 180 }}
            onClick={() => {
              onClickHandler(conf.validate, conf.onClick);
            }}
            transparent={!!conf.transparent}
          >
            {conf.title}
          </Button>
        ))}
      </Box>
    </Box>
  );
});
