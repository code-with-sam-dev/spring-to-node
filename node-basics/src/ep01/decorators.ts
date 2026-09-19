function Injectable(): ClassDecorator {
  console.log('  [decorator body ran]');
  return (target) => {
    console.log('  [decorator applied to]', (target as any).name);
  };
}

console.log('1. before the class is defined');

@Injectable()
class PaymentService {
  charge() { return 'charged'; }
}

console.log('2. class is defined, no instance exists yet');
const svc = new PaymentService();
console.log('3. first instance created ->', svc.charge());
